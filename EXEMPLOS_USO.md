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

### Interface Web: `/admin/qrcode`

O promotor acessa a seção de gerar QR Code no webapp admin:

1. **Faz login** no sistema administrativo
2. **Acessa seção "Gerar QR Code"**
3. **Seleciona ativação** no dropdown (apenas ativações ativas são mostradas)
4. **Clica em "Gerar QR Code"**
5. **Recebe QR Code** com URL funcional para exibir

### Via GraphQL:
```graphql
mutation GerarQRCodeAtivacao {
  gerarQRCodeAtivacao(ativacaoId: "507f1f77bcf86cd799439011") {
    success
    message
    qrCodeDataURL
  }
}
```

**Resposta de sucesso:**
```json
{
  "data": {
    "gerarQRCodeAtivacao": {
      "success": true,
      "message": "QR Code gerado com sucesso",
      "qrCodeDataURL": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
    }
  }
}
```

**QR Code contém URL:**
```
https://seuapp.com/checkin?uuid=abc123-def456&ativacaoId=507f1f77bcf86cd799439011&tipo=ativacao_checkin&timestamp=1701234567890
```

**Nota**: Apenas usuários autenticados podem gerar QR codes. Cada QR Code contém uma URL completa que funciona com qualquer leitor de QR Code.

## 3. Usuário Escaneando QR Code

### Fluxo Otimizado (UX Superior)

1. **Usuário escaneia QR Code** com qualquer câmera de celular
2. **URL abre automaticamente** no navegador do dispositivo:
   ```
   https://seuapp.com/checkin?uuid=abc123-def456&ativacaoId=507f1f77bcf86cd799439011&tipo=ativacao_checkin&timestamp=1701234567890
   ```
3. **Frontend extrai dados** automaticamente dos parâmetros da URL
4. **Chama mutation** automaticamente para fazer check-in

### Via GraphQL:
```graphql
mutation EscanearQRCode {
  escanearQRCode(
    qrCodeData: "https://seuapp.com/checkin?uuid=abc123-def456&ativacaoId=507f1f77bcf86cd799439011&tipo=ativacao_checkin&timestamp=1701234567890"
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

## 7. Fluxo Completo de Uso ATUALIZADO

### Para o Admin:
1. Cria evento no sistema
2. Cria ativações para o evento
3. Monitora check-ins em tempo real

### Para o Promotor:
1. **Faz login** no webapp administrativo
2. **Acessa seção "Gerar QR Code"**
3. **Seleciona ativação** no dropdown (apenas ativas)
4. **Clica "Gerar QR Code"**
5. **Recebe QR code com URL funcional**
6. **Exibe QR code** na tela/projetor

### Para o Participante (UX Otimizada):
1. **Escaneia QR code** com qualquer câmera de celular
2. **URL abre automaticamente** no navegador
3. **Check-in processado automaticamente**
4. **Recebe confirmação** e pontos são somados
5. **Sem passos manuais** - fluxo 100% automático

### Tecnicamente (Nova Arquitetura):
- **QR Code**: Contém URL completa (não JSON)
  ```
  https://app.com/checkin?uuid=abc123&ativacaoId=507f1f77&tipo=ativacao_checkin&timestamp=1701234567890
  ```
- **Frontend**: Extrai parâmetros da URL automaticamente
- **Backend**: `escanearQRCode` processa URL → Valida → Cria check-in
- **Compatibilidade**: Funciona com qualquer leitor de QR Code

### Vantagens da Nova Implementação:
✅ **Zero Friction**: Usuário não precisa abrir app específico  
✅ **Universal**: Funciona em qualquer dispositivo com câmera  
✅ **Automático**: Redirecionamento e processamento sem intervenção  
✅ **Seguro**: Validações de tipo, ativação ativa, anti-duplicação  
✅ **Performance**: Busca otimizada com UUID + ID da ativação

