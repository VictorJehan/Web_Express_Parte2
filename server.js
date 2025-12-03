const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());


const db = new sqlite3.Database("./concessionaria.db", (err) => {
  if (err) {
    console.error("Erro ao conectar ao banco:", err);
  } else {
    console.log("✅ Conectado ao banco SQLite");
    inicializarTabelas();
  }
});


function inicializarTabelas() {
  db.serialize(() => {
    
    db.run(`
      CREATE TABLE IF NOT EXISTS veiculos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        marca TEXT NOT NULL,
        modelo TEXT NOT NULL,
        ano INTEGER NOT NULL,
        disponivel INTEGER DEFAULT 1
      )
    `);

    
    db.run(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE
      )
    `);

    
    db.run(`
      CREATE TABLE IF NOT EXISTS vendedores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        setor TEXT NOT NULL
      )
    `);

    
    db.run(`
      CREATE TABLE IF NOT EXISTS vendas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER NOT NULL,
        veiculo_id INTEGER NOT NULL,
        vendedor_id INTEGER NOT NULL,
        data TEXT NOT NULL,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (veiculo_id) REFERENCES veiculos(id),
        FOREIGN KEY (vendedor_id) REFERENCES vendedores(id)
      )
    `);

    
    db.run(`
      CREATE TABLE IF NOT EXISTS financiamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venda_id INTEGER NOT NULL,
        valor_total REAL NOT NULL,
        parcelas INTEGER NOT NULL,
        valor_parcela REAL NOT NULL,
        taxa_juros REAL NOT NULL,
        banco TEXT NOT NULL,
        FOREIGN KEY (venda_id) REFERENCES vendas(id)
      )
    `);

    
    db.run(`
      CREATE TABLE IF NOT EXISTS manutencoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        veiculo_id INTEGER NOT NULL,
        cliente_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        descricao TEXT NOT NULL,
        valor REAL NOT NULL,
        data TEXT NOT NULL,
        status TEXT DEFAULT 'Pendente',
        FOREIGN KEY (veiculo_id) REFERENCES veiculos(id),
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
      )
    `);

    
    db.run(`
      CREATE TABLE IF NOT EXISTS test_drives (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER NOT NULL,
        veiculo_id INTEGER NOT NULL,
        vendedor_id INTEGER NOT NULL,
        data_agendamento TEXT NOT NULL,
        status TEXT DEFAULT 'Agendado',
        observacoes TEXT,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (veiculo_id) REFERENCES veiculos(id),
        FOREIGN KEY (vendedor_id) REFERENCES vendedores(id)
      )
    `);

    console.log("✅ Tabelas criadas/verificadas com sucesso");
  });
}


app.post("/veiculos", (req, res) => {
  const { marca, modelo, ano } = req.body;
  db.run(
    "INSERT INTO veiculos (marca, modelo, ano) VALUES (?, ?, ?)",
    [marca, modelo, ano],
    function (err) {
      if (err) return res.status(500).json({ erro: err.message });
      res.status(201).json({ id: this.lastID, marca, modelo, ano, disponivel: 1 });
    }
  );
});

app.get("/veiculos", (req, res) => {
  db.all("SELECT * FROM veiculos", [], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

app.put("/veiculos/:id", (req, res) => {
  const { marca, modelo, ano, disponivel } = req.body;
  db.run(
    "UPDATE veiculos SET marca = ?, modelo = ?, ano = ?, disponivel = ? WHERE id = ?",
    [marca, modelo, ano, disponivel, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ erro: err.message });
      res.json({ mensagem: "Veículo atualizado" });
    }
  );
});

app.delete("/veiculos/:id", (req, res) => {
  db.run("DELETE FROM veiculos WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ erro: err.message });
    res.json({ mensagem: "Veículo removido" });
  });
});


app.post("/clientes", (req, res) => {
  const { nome, email } = req.body;
  db.run(
    "INSERT INTO clientes (nome, email) VALUES (?, ?)",
    [nome, email],
    function (err) {
      if (err) return res.status(500).json({ erro: err.message });
      res.status(201).json({ id: this.lastID, nome, email });
    }
  );
});

app.get("/clientes", (req, res) => {
  db.all("SELECT * FROM clientes", [], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

app.delete("/clientes/:id", (req, res) => {
  db.run("DELETE FROM clientes WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ erro: err.message });
    res.json({ mensagem: "Cliente removido" });
  });
});


app.post("/vendedores", (req, res) => {
  const { nome, setor } = req.body;
  db.run(
    "INSERT INTO vendedores (nome, setor) VALUES (?, ?)",
    [nome, setor],
    function (err) {
      if (err) return res.status(500).json({ erro: err.message });
      res.status(201).json({ id: this.lastID, nome, setor });
    }
  );
});

app.get("/vendedores", (req, res) => {
  db.all("SELECT * FROM vendedores", [], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

app.delete("/vendedores/:id", (req, res) => {
  db.run("DELETE FROM vendedores WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ erro: err.message });
    res.json({ mensagem: "Vendedor removido" });
  });
});


app.post("/vendas", (req, res) => {
  const { clienteId, veiculoId, vendedorId } = req.body;
  const data = new Date().toISOString();

  db.serialize(() => {
    db.run(
      "UPDATE veiculos SET disponivel = 0 WHERE id = ?",
      [veiculoId],
      function (err) {
        if (err) return res.status(500).json({ erro: err.message });

        db.run(
          "INSERT INTO vendas (cliente_id, veiculo_id, vendedor_id, data) VALUES (?, ?, ?, ?)",
          [clienteId, veiculoId, vendedorId, data],
          function (err) {
            if (err) return res.status(500).json({ erro: err.message });
            res.status(201).json({ id: this.lastID, clienteId, veiculoId, vendedorId, data });
          }
        );
      }
    );
  });
});

app.get("/vendas", (req, res) => {
  const query = `
    SELECT v.*, 
           c.nome as cliente_nome, c.email as cliente_email,
           vei.marca, vei.modelo, vei.ano,
           vend.nome as vendedor_nome, vend.setor as vendedor_setor
    FROM vendas v
    JOIN clientes c ON v.cliente_id = c.id
    JOIN veiculos vei ON v.veiculo_id = vei.id
    JOIN vendedores vend ON v.vendedor_id = vend.id
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    const vendas = rows.map(row => ({
      id: row.id,
      data: row.data,
      cliente: { id: row.cliente_id, nome: row.cliente_nome, email: row.cliente_email },
      veiculo: { id: row.veiculo_id, marca: row.marca, modelo: row.modelo, ano: row.ano },
      vendedor: { id: row.vendedor_id, nome: row.vendedor_nome, setor: row.vendedor_setor }
    }));
    res.json(vendas);
  });
});

app.delete("/vendas/:id", (req, res) => {
  db.get("SELECT veiculo_id FROM vendas WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ erro: err.message });
    if (!row) return res.status(404).json({ erro: "Venda não encontrada" });

    db.serialize(() => {
      db.run("UPDATE veiculos SET disponivel = 1 WHERE id = ?", [row.veiculo_id]);
      db.run("DELETE FROM vendas WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ erro: err.message });
        res.json({ mensagem: "Venda cancelada" });
      });
    });
  });
});


app.post("/financiamentos", (req, res) => {
  const { vendaId, valorTotal, parcelas, valorParcela, taxaJuros, banco } = req.body;
  db.run(
    "INSERT INTO financiamentos (venda_id, valor_total, parcelas, valor_parcela, taxa_juros, banco) VALUES (?, ?, ?, ?, ?, ?)",
    [vendaId, valorTotal, parcelas, valorParcela, taxaJuros, banco],
    function (err) {
      if (err) return res.status(500).json({ erro: err.message });
      res.status(201).json({ id: this.lastID, vendaId, valorTotal, parcelas, valorParcela, taxaJuros, banco });
    }
  );
});

app.get("/financiamentos", (req, res) => {
  const query = `
    SELECT f.*, 
           c.nome as cliente_nome,
           vei.marca, vei.modelo
    FROM financiamentos f
    JOIN vendas v ON f.venda_id = v.id
    JOIN clientes c ON v.cliente_id = c.id
    JOIN veiculos vei ON v.veiculo_id = vei.id
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

app.delete("/financiamentos/:id", (req, res) => {
  db.run("DELETE FROM financiamentos WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ erro: err.message });
    res.json({ mensagem: "Financiamento removido" });
  });
});


app.post("/manutencoes", (req, res) => {
  const { veiculoId, clienteId, tipo, descricao, valor } = req.body;
  const data = new Date().toISOString();

  db.run(
    "INSERT INTO manutencoes (veiculo_id, cliente_id, tipo, descricao, valor, data) VALUES (?, ?, ?, ?, ?, ?)",
    [veiculoId, clienteId, tipo, descricao, valor, data],
    function (err) {
      if (err) return res.status(500).json({ erro: err.message });
      res.status(201).json({ id: this.lastID, veiculoId, clienteId, tipo, descricao, valor, data });
    }
  );
});

app.get("/manutencoes", (req, res) => {
  const query = `
    SELECT m.*, 
           c.nome as cliente_nome,
           vei.marca, vei.modelo, vei.ano
    FROM manutencoes m
    JOIN clientes c ON m.cliente_id = c.id
    JOIN veiculos vei ON m.veiculo_id = vei.id
    ORDER BY m.data DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

app.put("/manutencoes/:id", (req, res) => {
  const { status } = req.body;
  db.run(
    "UPDATE manutencoes SET status = ? WHERE id = ?",
    [status, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ erro: err.message });
      res.json({ mensagem: "Status atualizado" });
    }
  );
});

app.delete("/manutencoes/:id", (req, res) => {
  db.run("DELETE FROM manutencoes WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ erro: err.message });
    res.json({ mensagem: "Manutenção removida" });
  });
});

app.post("/test-drives", (req, res) => {
  const { clienteId, veiculoId, vendedorId, dataAgendamento, observacoes } = req.body;

  db.run(
    "INSERT INTO test_drives (cliente_id, veiculo_id, vendedor_id, data_agendamento, observacoes) VALUES (?, ?, ?, ?, ?)",
    [clienteId, veiculoId, vendedorId, dataAgendamento, observacoes],
    function (err) {
      if (err) return res.status(500).json({ erro: err.message });
      res.status(201).json({ id: this.lastID, clienteId, veiculoId, vendedorId, dataAgendamento, observacoes });
    }
  );
});

app.get("/test-drives", (req, res) => {
  const query = `
    SELECT t.*, 
           c.nome as cliente_nome, c.email as cliente_email,
           vei.marca, vei.modelo, vei.ano,
           vend.nome as vendedor_nome
    FROM test_drives t
    JOIN clientes c ON t.cliente_id = c.id
    JOIN veiculos vei ON t.veiculo_id = vei.id
    JOIN vendedores vend ON t.vendedor_id = vend.id
    ORDER BY t.data_agendamento DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

app.put("/test-drives/:id", (req, res) => {
  const { status } = req.body;
  db.run(
    "UPDATE test_drives SET status = ? WHERE id = ?",
    [status, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ erro: err.message });
      res.json({ mensagem: "Status atualizado" });
    }
  );
});

app.delete("/test-drives/:id", (req, res) => {
  db.run("DELETE FROM test_drives WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ erro: err.message });
    res.json({ mensagem: "Test drive removido" });
  });
});


app.use(express.static(path.join(__dirname, "public")));


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`🚗 Servidor da Concessionária Rodando!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`💾 Banco: SQLite`);
  console.log(`========================================`);
});


process.on("SIGINT", () => {
  db.close((err) => {
    if (err) console.error(err.message);
    console.log("Banco fechado");
    process.exit(0);
  });
});