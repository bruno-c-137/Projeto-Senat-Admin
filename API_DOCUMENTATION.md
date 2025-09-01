# 📚 Documentação das APIs - Sistema de Check-in com Pontos

## 🚀 Visão Geral

Este sistema permite gerenciar check-ins via QR code com sistema de pontuação gamificado. Os pontos são definidos pelo administrador por evento, garantindo controle total sobre a pontuação. **Todos os check-ins são realizados exclusivamente via QR code**. Todas as APIs retornam respostas em JSON.

## 🔗 Endpoints Disponíveis

### 1. **Gerar QR Code para Check-in**
**POST** `/api/checkin/qrcode`

Gera um QR code personalizado com dados específicos para check-in. Os pontos são automaticamente obtidos do evento definido pelo admin.

**Body:**
```json
{
  "local": "Auditório Principal",
  "evento": "evento-id-123"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "data": {
    "tipo": "checkin",
    "local": "Auditório Principal",
    "pontos": 15,
    "evento": "Workshop de Tecnologia",
    "eventoId": "evento-id-123",
    "timestamp": "2024-01-15T10:00:00.000Z"
  }
}
```

**GET** `/api/checkin/qrcode?local=Auditório&evento=evento-id-123`
- Retorna o QR code como SVG
- Parâmetros via query string
- **Obrigatório**: `evento` (ID do evento)

---

### 2. **Realizar Check-in via QR Code**
**POST** `/api/checkin/scan`

Processa o scan do QR code e realiza o check-in do usuário. Valida se o evento existe, está ativo e não expirou.

**Body:**
```json
{
  "qrData": "{\"tipo\":\"checkin\",\"local\":\"Auditório\",\"pontos\":15,\"eventoId\":\"evento-id-123\"}",
  "userId": "user-123"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Check-in realizado com sucesso em Auditório! +15 pontos",
  "checkIn": {
    "id": "checkin-456",
    "userId": "user-123",
    "pontosGanhos": 15,
    "local": "Auditório",
    "createdAt": "2024-01-15T10:00:00.000Z"
  },
  "pontosAtuais": 25,
  "evento": "Workshop de Tecnologia",
  "eventoId": "evento-id-123"
}
```

**Validações:**
- Evento deve existir no banco de dados
- Evento não pode estar cancelado
- Evento não pode ter expirado (mais de 24h após a data)
- Usuário não pode fazer check-in no mesmo local em menos de 5 minutos

---

### 3. **Buscar Histórico de Check-ins**
**GET** `/api/checkin/historico?userId=user-123`

Retorna o histórico completo de check-ins de um usuário.

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "checkIns": [
      {
        "id": "checkin-123",
        "pontosGanhos": 15,
        "local": "Auditório Principal",
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "totalPontos": 150,
    "totalCheckIns": 10
  }
}
```

---

### 4. **Ranking de Usuários**
**GET** `/api/checkin/ranking`

Retorna o ranking completo de usuários ordenados por pontos.

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-123",
        "name": "João Silva",
        "email": "joao@email.com",
        "pontos": 150,
        "checkIns": [...]
      }
    ],
    "top3": [...],
    "estatisticas": {
      "totalUsers": 50,
      "totalPontos": 5000,
      "mediaPontos": 100
    }
  }
}
```

---

### 5. **Estatísticas Gerais**
**GET** `/api/checkin/estatisticas`

Retorna estatísticas gerais do sistema.

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 50,
    "totalCheckIns": 150,
    "totalPontos": 5000,
    "checkInsHoje": 5,
    "checkInsSemana": 25,
    "checkInsMes": 100,
    "topLocais": [
      { "local": "Auditório", "count": 30 }
    ],
    "usuariosMaisAtivos": [...]
  }
}
```

---

## 🎯 Configuração de Pontos por Evento

### Modelo Events
O administrador pode definir os pontos por evento através do campo `pontos` no modelo Events:

```typescript
{
  id: "evento-123",
  evento: "Workshop de Tecnologia",
  descricao: "Workshop sobre novas tecnologias",
  data: "2024-01-15T10:00:00.000Z",
  local: "Auditório Principal",
  pontos: 15, // Pontos definidos pelo admin
  status: "agendado",
  responsavel: "admin-id"
}
```

### Fluxo de Pontos
1. **Admin cria evento** com pontos específicos
2. **QR Code é gerado** automaticamente com os pontos do evento
3. **Usuário escaneia** o QR code e faz check-in
4. **Sistema valida** se o evento está ativo e não expirou
5. **Pontos são atribuídos** automaticamente

---

## 🔒 Segurança e Validações

- **Pontos controlados pelo admin**: Não é possível definir pontos na geração do QR code
- **Check-in exclusivo via QR code**: Não há check-in manual
- **Validação de evento**: Check-in só é permitido em eventos válidos e ativos
- **Prevenção de spam**: Limite de 5 minutos entre check-ins no mesmo local
- **Expiração de eventos**: Eventos expiram 24h após a data programada
- **Status do evento**: Eventos cancelados não permitem check-in

---

## 🛠️ Painel Administrativo

### Gerenciamento de Check-ins
O painel administrativo permite **visualizar** todos os check-ins realizados, mas **não permite criação ou edição manual**:

- ✅ **Visualização**: Ver todos os check-ins com detalhes
- ✅ **Filtros**: Filtrar por usuário, local, data
- ✅ **Auditoria**: Rastrear histórico completo
- ❌ **Criação manual**: Bloqueada via controle de acesso
- ❌ **Edição manual**: Bloqueada via controle de acesso
- ❌ **Exclusão manual**: Bloqueada via controle de acesso

### Modelos Disponíveis no Admin
1. **Users**: Gerenciar usuários e pontos
2. **Events**: Criar eventos e definir pontos
3. **Check-ins**: Visualizar check-ins (somente leitura)

### ⚠️ Importante
- **APIs continuam funcionando**: Check-ins via QR code funcionam normalmente
- **Bloqueio apenas no admin**: Interface administrativa não permite manipulação
- **Segurança mantida**: Apenas check-ins via QR code são permitidos

---

## 📝 Códigos de Erro

- `400`: Dados inválidos ou validações falharam
- `404`: Usuário ou evento não encontrado
- `405`: Método HTTP não permitido
- `500`: Erro interno do servidor

---

## 🚀 Como Usar

1. **Admin cria evento** com pontos específicos
2. **Gera QR code** passando o ID do evento
3. **Usuário escaneia** o QR code
4. **Sistema valida** e atribui pontos automaticamente
5. **Ranking atualizado** em tempo real

---

## 📱 Fluxo Completo do Sistema

```
Admin → Cria Evento (define pontos) → Gera QR Code → Usuário Escaneia → Check-in Automático → Pontos Atribuídos → Ranking Atualizado
```

**Não há check-in manual** - todo o processo é automatizado via QR code para garantir segurança e controle total dos pontos pelo administrador.

