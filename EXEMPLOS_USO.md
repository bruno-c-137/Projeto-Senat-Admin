# Exemplos de Uso - Sistema de Check-in

## 1. Criando uma Ativação (Admin)

### Via Admin UI:
1. Acesse `/admin`
2. Vá em "Ativações" → "Create Ativacao"
3. Preencha:
   - **Nome**: "Palestra sobre IA"
   - **Pontuação**: 50
   - **Evento**: Selecione um evento (opcional)
   - **Status**: "Ativa"
4. Salve - o UUID será gerado automaticamente

### Via GraphQL:
```graphql
mutation CriarAtivacao {
  createAtivacao(data: {
    nome: "Palestra sobre IA"
    pontuacao: 50
    evento: { connect: { id: "cl9ebqhxk00as2w01wh9vsm3k" } }
    ativa: "ativa"
  }) {
    id
    nome
    uuid
    pontuacao
    qrCodeURL
  }
}
```

## 2. Promotor Gerando QR Code

### Rota: `/gerar-code`

O promotor acessa a rota `/gerar-code` no site e:

1. **Seleciona o evento** no dropdown
2. **Clica em "Gerar Code"**
3. **Recebe o QR code** relacionado ao evento

### Via GraphQL:
```graphql
mutation GerarQRCodeEvento {
  gerarQRCodePorEvento(eventId: "cl9ebqhxk00as2w01wh9vsm3k") {
    success
    message
    qrCodeDataURL
    ativacao {
      id
      nome
      pontuacao
      uuid
    }
  }
}
```

**Resposta de sucesso:**
```json
{
  "data": {
    "gerarQRCodePorEvento": {
      "success": true,
      "message": "QR Code gerado com sucesso para Congresso de Tecnologia 2024!",
      "qrCodeDataURL": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
      "ativacao": {
        "id": "cl9ec1hxk00bt2w01wh9vsn4l",
        "nome": "Check-in Congresso de Tecnologia 2024",
        "pontuacao": 10,
        "uuid": "550e8400-e29b-41d4-a716-446655440000"
      }
    }
  }
}
```

**Nota**: Apenas o responsável pelo evento ou admin pode gerar QR codes. Se não existir ativação para o evento, uma será criada automaticamente.

## 3. Usuário Escaneando QR Code no Site

### Passo 1: Acessar Scanner
O usuário acessa o site e clica em "Escanear QR Code"

### Passo 2: Abrir Câmera
O site abre a câmera do dispositivo para escanear o QR code do promotor

### Passo 3: Escanear e Validar
```graphql
mutation EscanearQRCode {
  escanearQRCode(
    qrCodeData: "{\"uuid\":\"123e4567-e89b-12d3-a456-426614174000\",\"tipo\":\"ativacao_checkin\",\"eventoId\":\"cl9ebqhxk00as2w01wh9vsm3k\",\"timestamp\":1640995200000}"
    local: "Auditório Principal"
  ) {
    success
    message
    checkIn {
      id
      pontosGanhos
      createdAt
      ativacao {
        nome
      }
    }
    pontuacaoTotal
    ativacao {
      id
      nome
      pontuacao
      evento {
        evento
      }
    }
  }
}
```

**Resposta de sucesso:**
```json
{
  "data": {
    "escanearQRCode": {
      "success": true,
      "message": "Check-in realizado com sucesso! Você ganhou 50 pontos.",
      "checkIn": {
        "id": "cl9ec1hxk00bt2w01wh9vsn4l",
        "pontosGanhos": 50,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "ativacao": {
          "nome": "Palestra sobre IA"
        }
      },
      "pontuacaoTotal": 150,
      "ativacao": {
        "id": "cl9ec1hxk00bt2w01wh9vsn4l",
        "nome": "Palestra sobre IA",
        "pontuacao": 50,
        "evento": {
          "evento": "Congresso de Tecnologia 2024"
        }
      }
    }
  }
}
```

**Nota**: O sistema valida automaticamente o QR code, verifica se a ativação está ativa, previne check-ins duplicados e atribui os pontos automaticamente.

## 4. Visualizando Histórico do Usuário

```graphql
query MeuHistorico {
  meuHistoricoCheckins {
    id
    pontosGanhos
    local
    createdAt
    ativacao {
      nome
      evento {
        evento
      }
    }
  }
}
```

**Resposta:**
```json
{
  "data": {
    "meuHistoricoCheckins": [
      {
        "id": "cl9ec1hxk00bt2w01wh9vsn4l",
        "pontosGanhos": 50,
        "local": "Auditório Principal",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "ativacao": {
          "nome": "Palestra sobre IA",
          "evento": {
            "evento": "Congresso de Tecnologia 2024"
          }
        }
      },
      {
        "id": "cl9ec2hxk00bu2w01wh9vsn5m",
        "pontosGanhos": 30,
        "local": "Sala 201",
        "createdAt": "2024-01-15T14:00:00.000Z",
        "ativacao": {
          "nome": "Workshop React",
          "evento": {
            "evento": "Congresso de Tecnologia 2024"
          }
        }
      }
    ]
  }
}
```

## 5. Consultando Pontuação Total do Usuário

```graphql
query MinhaPontuacao {
  user(where: { id: "usuario_id_atual" }) {
    name
    pontos          # Pontos manuais
    pontuacaoTotal  # Pontos manuais + check-ins
    checkIns {
      id
    }
  }
}
```

## 6. Casos de Erro Comuns

### Check-in Duplicado
```json
{
  "data": {
    "realizarCheckin": {
      "success": false,
      "message": "Você já realizou check-in nesta ativação",
      "checkIn": null,
      "pontuacaoTotal": null
    }
  }
}
```

### Ativação Inativa
```json
{
  "data": {
    "realizarCheckin": {
      "success": false,
      "message": "Esta ativação não está mais disponível",
      "checkIn": null,
      "pontuacaoTotal": null
    }
  }
}
```

### QR Code Inválido
```json
{
  "data": {
    "buscarAtivacaoPorUuid": {
      "success": false,
      "message": "QR Code inválido - ativação não encontrada",
      "ativacao": null,
      "jaFezCheckin": null
    }
  }
}
```

### Usuário Não Autenticado
```json
{
  "data": {
    "realizarCheckin": {
      "success": false,
      "message": "Usuário não autenticado",
      "checkIn": null,
      "pontuacaoTotal": null
    }
  }
}
```

## 7. Fluxo Completo de Uso

### Para o Admin:
1. Cria evento no sistema
2. Cria ativações para o evento
3. Monitora check-ins em tempo real

### Para o Promotor:
1. Acessa `/gerar-code` no site
2. Seleciona evento no dropdown
3. Clica "Gerar Code"
4. Recebe QR code para o evento
5. Exibe QR code no local do evento

### Para o Participante:
1. Faz login no app móvel
2. Escaneia QR code da ativação
3. Confirma check-in
4. Recebe pontos automaticamente
5. Visualiza histórico e pontuação total

### Tecnicamente:
- **Site**: Promotor gera QR → Chama `gerarQRCodePorEvento` → Recebe QR code
- **App Móvel**: Escaneia QR → Chama `buscarAtivacaoPorUuid` → Chama `realizarCheckin`
- **Backend**: Valida usuário → Verifica ativação → Previne duplicação → Cria check-in → Atualiza pontuação

