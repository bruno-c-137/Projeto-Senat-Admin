# Sistema de Check-in com QR Codes

## Visão Geral

Este sistema permite que admins criem ativações com QR codes únicos e que usuários façam check-ins escaneando esses códigos, ganhando pontos automaticamente.

## Modelos (Schemas)

### 1. Ativacao
- **Nome**: Nome da ativação
- **Pontuação**: Pontos que o usuário ganha ao fazer check-in
- **UUID**: Identificador único gerado automaticamente
- **Evento**: Relacionamento opcional com um evento
- **Status**: Ativa ou Inativa (apenas ativações ativas permitem check-in)
- **QR Code URL**: URL gerada automaticamente para acessar o QR code

### 2. CheckIn (atualizado)
- **Usuário**: Referência ao usuário que fez check-in
- **Ativação**: Referência à ativação escaneada
- **Pontos Ganhos**: Copiado da ativação no momento do check-in
- **Local**: Local onde o check-in foi realizado (opcional)
- **Data**: Timestamp automático

### 3. User (atualizado)
- **Pontuação Total**: Campo virtual que calcula pontos manuais + pontos de check-ins

## APIs GraphQL

### Mutations

#### `gerarQRCodeAtivacao`
Gera QR code contendo URL para uma ativação específica.

```graphql
mutation {
  gerarQRCodeAtivacao(ativacaoId: "507f1f77bcf86cd799439011") {
    success
    message
    qrCodeDataURL
  }
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "QR Code gerado com sucesso",
  "qrCodeDataURL": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**QR Code contém URL:**
```
https://seuapp.com/checkin?uuid=abc123-def456&ativacaoId=507f1f77&tipo=ativacao_checkin&timestamp=1701234567890
```

#### `escanearQRCode`
Processa dados do QR Code escaneado e realiza check-in.

```graphql
mutation {
  escanearQRCode(
    qrCodeData: "https://app.com/checkin?uuid=abc123&ativacaoId=507f1f77&tipo=ativacao_checkin&timestamp=1701234567890"
    local: "Auditório Principal"
  ) {
    success
    message
    checkIn {
      id
      pontosGanhos
      createdAt
    }
    pontuacaoTotal
    ativacao {
      id
      nome
      pontuacao
    }
  }
}
```

### Queries

#### `buscarAtivacaoPorUuid`
Busca informações de uma ativação pelo UUID (para validar QR code).

```graphql
query {
  buscarAtivacaoPorUuid(uuid: "123e4567-e89b-12d3-a456-426614174000") {
    success
    message
    ativacao
    jaFezCheckin
  }
}
```

#### `meuHistoricoCheckins`
Retorna histórico de check-ins do usuário autenticado.

```graphql
query {
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

## Fluxo Completo do Sistema

### 1. Promotor (Geração de QR Code)
1. Acessa webapp admin
2. Vai para seção "Gerar QR Code"
3. **Seleciona ativação** no dropdown (ativações ativas)
4. Clica em "Gerar QR Code"
5. Recebe QR Code com **URL funcional**
6. Exibe QR Code na tela/projetor

### 2. Usuário (Check-in)
1. **Escaneia QR Code** com qualquer câmera de celular
2. **URL abre automaticamente** no navegador: 
   ```
   https://app.com/checkin?uuid=abc123&ativacaoId=507f1f77&tipo=ativacao_checkin&timestamp=1701234567890
   ```
3. **Frontend processa automaticamente** os parâmetros da URL
4. **Chama mutation `escanearQRCode`** com os dados
5. **Recebe confirmação** e pontos são somados
6. **UX fluida** - sem necessidade de copiar/colar dados

### 3. Tecnicamente
- **QR Code**: Contém URL completa (não JSON bruto)
- **Compatibilidade**: Funciona com qualquer leitor de QR Code
- **Dados**: UUID + ID da ativação + tipo + timestamp
- **Segurança**: Valida tipo, ativação ativa, duplicação
- **Performance**: ID da ativação permite busca direta

### Vantagens da Nova Arquitetura
✅ **UX Superior**: Qualquer pessoa pode escanear e usar  
✅ **Zero Friction**: Abre direto no webapp  
✅ **Compatibilidade Universal**: Funciona em qualquer dispositivo  
✅ **Dados Completos**: UUID + ID para máxima flexibilidade  
✅ **Código Limpo**: Removido código redundante  
✅ **🚨 Anti-Fraude**: QR Codes expiram em 5 minutos  
✅ **🔒 Segurança**: Previne uso de fotos de QR Codes

### Segurança Anti-Fraude

Para evitar que participantes tirem fotos dos QR Codes e os usem posteriormente:

**🕐 Expiração Automática:**
- QR Codes são válidos por apenas **5 minutos**
- Após expirar, usuário deve solicitar novo QR Code
- Timestamp incluído na URL para validação

**⚠️ Cenários Prevenidos:**
- ❌ Tirar foto do QR Code durante evento
- ❌ Usar foto em outro local/horário  
- ❌ Compartilhar QR Code com outras pessoas
- ❌ Check-in sem estar presente no evento

**✅ Fluxo de Segurança:**
1. Promotor gera QR Code → Válido por 5 minutos
2. Usuário escaneia → Sistema valida timestamp
3. Se expirado → Erro: "QR Code expirado"
4. Se válido → Processa check-in normalmente  

## Endpoints HTTP

### QR Code Image
```