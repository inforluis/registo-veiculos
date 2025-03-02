const express = require("express");
const multer = require("multer");
const bodyParser = require("body-parser");
const { google } = require("googleapis");
const fs = require("fs");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configuração do Multer para salvar a foto em memória (sem salvar no servidor)
const upload = multer({ storage: multer.memoryStorage() });

// Credenciais OAuth2
const OAuth2Client = new google.auth.OAuth2(
  "1Pe8_liwPiL9VKmzb9ySdQXTGyb78dVpH", // Substitua com seu Client ID
  "YOUR_CLIENT_SECRET", // Substitua com seu Client Secret
  "YOUR_REDIRECT_URI" // Substitua com seu URI de redirecionamento
);

const drive = google.drive({ version: "v3", auth: OAuth2Client });

// Rota para iniciar o processo de autenticação OAuth2
app.get("/auth", (req, res) => {
  const authUrl = OAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.file"],
  });
  res.redirect(authUrl);
});

// Rota de callback de autenticação OAuth2
app.get("/oauth2callback", async (req, res) => {
  const { tokens } = await OAuth2Client.getToken(req.query.code);
  OAuth2Client.setCredentials(tokens);

  // Salve os tokens de acesso para uploads futuros
  fs.writeFileSync("tokens.json", JSON.stringify(tokens));
  res.send("Autenticado com sucesso! Agora você pode enviar fotos.");
});

// Rota para fazer upload da foto no Google Drive
app.post("/upload", upload.single("foto"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("Nenhuma foto foi enviada!");
  }

  // Carregar tokens de acesso
  const tokens = JSON.parse(fs.readFileSync("tokens.json", "utf8"));
  OAuth2Client.setCredentials(tokens);

  // Configuração para enviar o arquivo para a pasta no Google Drive
  const fileMetadata = {
    name: req.file.originalname, // Nome do arquivo enviado
    parents: ["1Pe8_liwPiL9VKmzb9ySdQXTGyb78dVpH"], // ID da pasta do Google Drive
  };
  const media = {
    mimeType: req.file.mimetype,
    body: req.file.buffer, // O arquivo que foi carregado via multer
  };

  try {
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id",
    });
    res.send(`Arquivo enviado com sucesso! ID: ${response.data.id}`);
  } catch (error) {
    console.error("Erro ao fazer upload da foto:", error);
    res.status(500).send("Erro ao fazer upload da foto.");
  }
});

// Iniciar o servidor
app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
