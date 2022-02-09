// Instanciar o express e as dependências
const express = require("express");
const { v4: uuidv4 } = require("uuid");

// Inicializar o express
const app = express();

// Virtual DB -> [] para simular um banco de dados
const customers = [];

// Middleware para verificar se a conta existe pelo CPF
function verifyIfExistsAccountCPF(req, res, next) {
  const { cpf } = req.headers;
  const customer = customers.find(customer => customer.cpf === cpf);
  if (!customer) {
    return res.status(400).json({ error: "Customer not found" });
  }
  req.customer = customer;
  return next();
}

// Função para verificar o balanço da conta (débitos e créditos)
function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === "credit") {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);
  return balance;
}

// Para ler formato JSON
app.use(express.json());

// ROTAS
// Criar conta
app.post("/account", (req, res) => {
  const { cpf, name } = req.body;

  const customerAlreadyExists = customers.some((customer) => customer.cpf === cpf);
  if (customerAlreadyExists) {
    return res.status(400).json({ error: "Customer already exists!" });
  }

  customers.push({
    cpf,
    name,
    id: uuidv4(),
    statement: []
  })
  return res.status(201).send();
})

// Extrato bancário (débitos e créditos)
app.get("/statement", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;
  res.status(200).json(customer.statement)
});

// Depósito (crédito)
app.post("/deposit", verifyIfExistsAccountCPF, (req, res) => {
  const { description, amount } = req.body;
  const { customer } = req;
  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  }
  customer.statement.push(statementOperation);
  return res.status(201).send();
})

// Saque (débito)
app.post("/withdraw", verifyIfExistsAccountCPF, (req, res) => {
  const { amount } = req.body;
  const { customer } = req;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    res.status(400).json({ error: "Insufficient funds!" });
  } else {
    const statementOperation = {
      amount,
      created_at: new Date(),
      type: "debit",
    }
    customer.statement.push(statementOperation);
    return res.status(201).send();
  }
})

// Extrato por data
app.get("/statement/date", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;
  const { date } = req.query;
  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter((statement) => statement.created_at.toDateString() === dateFormat.toDateString());

  res.status(200).json(statement);
});

// Atualizar conta
app.put("/account", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;
  const { name } = req.body;

  customer.name = name;

  return res.status(201).send();
})

// Pegar dados da conta
app.get("/account", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;
  return res.status(200).json(customer);
})

// Deletar conta
app.delete("/account", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;
  customers.splice(customer, 1);
  return res.status(200).json("Account was deleted");
})

// Mostrar o balanço da conta (saldo final)
app.get("/balance", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;
  const balance = getBalance(customer.statement);
  return res.status(200).json(balance);
})

// Ouvir o servidor
app.listen(3333, () => console.log("Server is running..."));