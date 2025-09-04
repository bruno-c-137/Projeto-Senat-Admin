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

#### `realizarCheckin`
Realiza check-in via UUID da ativação.

```graphql
mutation {
  realizarCheckin(
    ativacaoUuid: "123e4567-e89b-12d3-a456-426614174000"
    local: "Auditório Principal"
  ) {
    success
    message
    checkIn
    pontuacaoTotal
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

#### `gerarQRCodeAtivacao`
Gera QR code para uma ativação (para admins).

```graphql
query {
  gerarQRCodeAtivacao(ativacaoId: "cl9ebqhxk00as2w01wh9vsm3k") {
    success
    message
    qrCodeDataURL
    qrCodeURL
  }
}
```

## Endpoints HTTP

### QR Code Image
```
GET /api/qrcode/{uuid}
```
Serve a imagem PNG do QR code para a ativação especificada.

## Fluxo de Uso

### Para Admins:

1. **Criar Ativação**:
   ```graphql
   mutation {
     createAtivacao(data: {
       nome: "Palestra sobre IA"
       pontuacao: 50
       evento: { connect: { id: "evento_id" } }
     }) {
       id
       uuid
       qrCodeURL
     }
   }
   ```

2. **Gerar QR Code via App Móvel**:
   - Use o app móvel para gerar QR codes
   - Ou chame `obterQRCodeAtivacao` para obter Data URL

3. **Exibir QR Code** para os participantes

### Para Usuários (App Móvel):

1. **Login no App Móvel**

2. **Gerar/Visualizar QR Codes**:
   ```graphql
   query {
     obterQRCodeAtivacao(ativacaoId: "ativacao_id") {
       success
       qrCodeDataURL
       qrCodeURL
     }
   }
   ```

3. **Escanear QR Code** com app móvel

4. **Validar Ativação**:
   ```graphql
   query {
     buscarAtivacaoPorUuid(uuid: "uuid_do_qr_code") {
       success
       ativacao
       jaFezCheckin
     }
   }
   ```

5. **Realizar Check-in**:
   ```graphql
   mutation {
     realizarCheckin(ativacaoUuid: "uuid_do_qr_code") {
       success
       message
       pontuacaoTotal
     }
   }
   ```

6. **Ver Histórico**:
   ```graphql
   query {
     meuHistoricoCheckins {
       pontosGanhos
       ativacao { nome }
       createdAt
     }
   }
   ```

## Recursos Implementados

✅ **Prevenção de Check-ins Duplicados**: Um usuário não pode fazer check-in na mesma ativação duas vezes

✅ **Validação de Status**: Apenas ativações ativas permitem check-in

✅ **Cálculo Automático de Pontuação**: Campo virtual que soma pontos manuais + check-ins

✅ **QR Codes Dinâmicos**: Gerados com UUID, nome do evento e timestamp

✅ **Relacionamentos Completos**: User ↔ CheckIn ↔ Ativacao ↔ Events

✅ **APIs RESTful e GraphQL**: Endpoints HTTP para imagens + queries/mutations GraphQL

## Estrutura do QR Code

O QR code contém um JSON com:
```json
{
  "uuid": "123e4567-e89b-12d3-a456-426614174000",
  "tipo": "ativacao_checkin", 
  "evento": "Nome do Evento",
  "timestamp": 1640995200000
}
```

## Configuração

### Variáveis de Ambiente
```env
PUBLIC_URL=http://localhost:3000  # URL base para QR codes
DATABASE_URL=postgresql://...     # Conexão PostgreSQL
```

### Dependências Adicionais
- `qrcode`: Geração de QR codes
- `uuid`: Geração de UUIDs únicos
- `@types/qrcode`, `@types/uuid`: Tipos TypeScript

## Próximos Passos

- [ ] Interface web para visualizar QR codes
- [ ] App móvel para escanear códigos
- [ ] Relatórios de participação
- [ ] Notificações em tempo real
- [ ] Integração com sistemas externos

