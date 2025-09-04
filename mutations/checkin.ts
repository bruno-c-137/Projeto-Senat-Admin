import { graphql } from '@keystone-6/core'
import type { Context } from '.keystone/types'
import * as QRCode from 'qrcode'

// Tipos reutilizáveis
type BaseResult = {
  success: boolean
  message: string
}

type QRCodePayload = {
  uuid: string
  tipo: 'ativacao_checkin'
  eventoId?: string
  timestamp: number
}

// Configurações do QR Code
const QR_CODE_CONFIG = {
  errorCorrectionLevel: 'M' as const,
  type: 'image/png' as const,
  margin: 2,
  color: { dark: '#000000', light: '#FFFFFF' },
  width: 300,
}

// Função utilitária para verificar autenticação
function verificarAutenticacao(context: Context): string | null {
  return context.session?.itemId || null
}

// Função utilitária para criar resposta de erro
function criarRespostaErro(message: string): BaseResult {
  return { success: false, message }
}

// Função utilitária para criar resposta de sucesso
function criarRespostaSucesso(message: string, data?: any): BaseResult & any {
  return { success: true, message, ...data }
}

// Função simples para gerar QR Code como Data URL
async function gerarQRCodeDataURL(uuid: string, nomeAtivacao?: string): Promise<string> {
  try {
    const payload = {
      uuid,
      tipo: 'ativacao_checkin',
      evento: nomeAtivacao,
      timestamp: Date.now(),
    }
    const qrString = JSON.stringify(payload)

    return QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
      width: 300,
    })
  } catch (error) {
    console.error('Erro ao gerar QR Code (DataURL):', error)
    throw new Error('Erro ao gerar QR Code')
  }
}
// Mutation para realizar check-in via UUID
export const realizarCheckin = graphql.field({
  type: graphql.object<{
    success: boolean
    message: string
    checkIn?: any
    pontuacaoTotal?: number
  }>()({
    name: 'CheckinResult',
    fields: {
      success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
      message: graphql.field({ type: graphql.nonNull(graphql.String) }),
      checkIn: graphql.field({
        type: graphql.JSON,
        resolve: (source) => source.checkIn,
      }),
      pontuacaoTotal: graphql.field({ type: graphql.Int }),
    },
  }),
  args: {
    ativacaoUuid: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    local: graphql.arg({ type: graphql.String }),
  },
  async resolve(source, { ativacaoUuid, local }, context: Context) {
    // Verifica se o usuário está autenticado
    if (!context.session?.itemId) {
      return {
        success: false,
        message: 'Usuário não autenticado',
      }
    }

    const userId = context.session.itemId

    try {
      // Busca a ativação pelo UUID
      const ativacao = await (context.query as any).Ativacao.findFirst({
        where: { uuid: { equals: ativacaoUuid } },
        query: 'id nome pontuacao ativa',
      })

      if (!ativacao) {
        return {
          success: false,
          message: 'Ativação não encontrada',
        }
      }

      // Verifica se a ativação está ativa
      if (ativacao.ativa !== 'ativa') {
        return {
          success: false,
          message: 'Esta ativação não está mais disponível',
        }
      }

      // Verifica se o usuário já fez check-in nesta ativação (evita duplicação)
      const checkInExistente = await (context.query as any).CheckIn.findFirst({
        where: {
          AND: [
            { user: { id: { equals: userId } } },
            { ativacao: { id: { equals: ativacao.id } } },
          ],
        },
        query: 'id',
      })

      if (checkInExistente) {
        return {
          success: false,
          message: 'Você já realizou check-in nesta ativação',
        }
      }

      // Cria o check-in
      const checkIn = await (context.query as any).CheckIn.createOne({
        data: {
          user: { connect: { id: userId } },
          ativacao: { connect: { id: ativacao.id } },
          pontosGanhos: ativacao.pontuacao,
          local: local || '',
        },
        query: 'id pontosGanhos createdAt user { id name } ativacao { id nome }',
      })

      // Busca a pontuação total atualizada do usuário
      const user = await context.query.User.findOne({
        where: { id: userId },
        query: 'pontuacaoTotal',
      })

      return {
        success: true,
        message: `Check-in realizado com sucesso! Você ganhou ${ativacao.pontuacao} pontos.`,
        checkIn,
        pontuacaoTotal: user?.pontuacaoTotal || 0,
      }
    } catch (error) {
      console.error('Erro ao realizar check-in:', error)
      return {
        success: false,
        message: 'Erro interno do servidor',
      }
    }
  },
})

// Query para buscar informações da ativação pelo UUID (para validar QR code)
export const buscarAtivacaoPorUuid = graphql.field({
  type: graphql.object<{
    success: boolean
    message: string
    ativacao?: any
    jaFezCheckin?: boolean
  }>()({
    name: 'AtivacaoResult',
    fields: {
      success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
      message: graphql.field({ type: graphql.nonNull(graphql.String) }),
      ativacao: graphql.field({
        type: graphql.JSON,
        resolve: (source) => source.ativacao,
      }),
      jaFezCheckin: graphql.field({ type: graphql.Boolean }),
    },
  }),
  args: {
    uuid: graphql.arg({ type: graphql.nonNull(graphql.String) }),
  },
  async resolve(source, { uuid }, context: Context) {
    try {
      // Busca a ativação pelo UUID
      const ativacao = await (context.query as any).Ativacao.findFirst({
        where: { uuid: { equals: uuid } },
        query: 'id nome pontuacao ativa evento { id evento } createdAt',
      })

      if (!ativacao) {
        return {
          success: false,
          message: 'QR Code inválido - ativação não encontrada',
        }
      }

      let jaFezCheckin = false

      // Se o usuário está autenticado, verifica se já fez check-in
      if (context.session?.itemId) {
        const checkInExistente = await (context.query as any).CheckIn.findFirst({
          where: {
            AND: [
              { user: { id: { equals: context.session.itemId } } },
              { ativacao: { id: { equals: ativacao.id } } },
            ],
          },
          query: 'id',
        })
        jaFezCheckin = !!checkInExistente
      }

      return {
        success: true,
        message: 'Ativação encontrada',
        ativacao,
        jaFezCheckin,
      }
    } catch (error) {
      console.error('Erro ao buscar ativação:', error)
      return {
        success: false,
        message: 'Erro interno do servidor',
      }
    }
  },
})

// Query para buscar histórico de check-ins do usuário
export const meuHistoricoCheckins = graphql.field({
  type: graphql.list(graphql.JSON),
  async resolve(source, args, context: Context) {
    if (!context.session?.itemId) {
      throw new Error('Usuário não autenticado')
    }

    const checkIns = await (context.query as any).CheckIn.findMany({
      where: { user: { id: { equals: context.session.itemId } } },
      query: `
        id
        pontosGanhos
        local
        createdAt
        ativacao {
          id
          nome
          evento {
            id
            evento
          }
        }
      `,
      orderBy: { createdAt: 'desc' },
    })

    return checkIns
  },
})

// Query para gerar QR Code de uma ativação (para admins)
export const gerarQRCodeAtivacao = graphql.field({
  type: graphql.object<{
    success: boolean
    message: string
    qrCodeDataURL?: string
    qrCodeURL?: string
  }>()({
    name: 'QRCodeResult',
    fields: {
      success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
      message: graphql.field({ type: graphql.nonNull(graphql.String) }),
      qrCodeDataURL: graphql.field({ type: graphql.String }),
      qrCodeURL: graphql.field({ type: graphql.String }),
    },
  }),
  args: {
    ativacaoId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
  },
  async resolve(source, { ativacaoId }, context: Context) {
    try {
      // Verifica se o usuário é admin (opcional - pode ajustar conforme necessário)
      if (!context.session?.itemId) {
        return {
          success: false,
          message: 'Usuário não autenticado',
        }
      }

      // Busca a ativação
      const ativacao = await (context.query as any).Ativacao.findOne({
        where: { id: ativacaoId },
        query: 'id nome uuid ativa evento { evento }',
      })

      if (!ativacao) {
        return {
          success: false,
          message: 'Ativação não encontrada',
        }
      }

      const nomeEvento = ativacao.evento?.evento || ativacao.nome

      // Gera o QR Code como Data URL
      const qrCodeDataURL = await gerarQRCodeDataURL(ativacao.uuid, nomeEvento)

      // URL para servir a imagem (assumindo que o servidor está rodando na porta padrão)
      const baseURL = process.env.PUBLIC_URL || 'http://localhost:3000'
      const qrCodeURL = `${baseURL}/api/qrcode/${ativacao.uuid}`

      return {
        success: true,
        message: 'QR Code gerado com sucesso',
        qrCodeDataURL,
        qrCodeURL,
      }
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error)
      return {
        success: false,
        message: 'Erro ao gerar QR Code',
      }
    }
  },
})

// Mutation para gerar QR Code por seleção (evento + ativação)
export const gerarQRCodePorSelecao = graphql.field({
  type: graphql.object<{
    success: boolean
    message: string
    qrCodeDataURL?: string
  }>()({
    name: 'GerarQrSelecaoResult',
    fields: {
      success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
      message: graphql.field({ type: graphql.nonNull(graphql.String) }),
      qrCodeDataURL: graphql.field({ type: graphql.String }),
    },
  }),
  args: {
    eventId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
    ativacaoId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
  },
  async resolve(source, { eventId, ativacaoId }, context: Context) {
    if (!context.session?.itemId) {
      return { success: false, message: 'Usuário não autenticado' }
    }

    try {
      const eventos = await context.query.Events.findMany({
        where: { id: { equals: eventId } },
        query: 'id evento responsavel { id }',
        take: 1,
      })
      const evento = eventos[0]

      if (!evento) {
        return { success: false, message: 'Evento não encontrado' }
      }

      const currentUser = await context.query.User.findOne({
        where: { id: context.session.itemId },
        query: 'id isAdmin',
      })

      if (!(currentUser?.isAdmin || evento.responsavel?.id === currentUser?.id)) {
        return { success: false, message: 'Acesso negado' }
      }

      const ativacoes = await context.query.Ativacao.findMany({
        where: { id: { equals: ativacaoId } },
        query: 'id nome pontuacao evento { id evento }',
        take: 1,
      })
      const ativacao = ativacoes[0]

      if (!ativacao || ativacao.evento?.id !== eventId) {
        return { success: false, message: 'Ativação não encontrada para este evento' }
      }

      // Gera UUID único e salva na ativação
      const { v4: uuidv4 } = await import('uuid')
      const novoUuid = uuidv4()

      // Atualiza a ativação com o novo UUID
      await context.query.Ativacao.updateOne({
        where: { id: ativacao.id },
        data: { uuid: novoUuid },
      })

      // Gera QR Code como Data URL (apenas GraphQL)
      const qrCodeDataURL = await gerarQRCodeDataURL(novoUuid, evento.evento)

      return {
        success: true,
        message: `QR Code gerado com sucesso! Evento: ${evento.evento} (${ativacao.pontuacao} pontos)`,
        qrCodeDataURL,
      }
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error)
      return { success: false, message: 'Erro ao gerar QR Code' }
    }
  },
})

// Mutation para usuário escanear QR code e fazer check-in
export const escanearQRCode = graphql.field({
  type: graphql.object<{
    success: boolean
    message: string
    checkIn?: any
    pontuacaoTotal?: number
    ativacao?: any
  }>()({
    name: 'EscanearQRCodeResult',
    fields: {
      success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
      message: graphql.field({ type: graphql.nonNull(graphql.String) }),
      checkIn: graphql.field({
        type: graphql.JSON,
        resolve: (source) => source.checkIn,
      }),
      pontuacaoTotal: graphql.field({ type: graphql.Int }),
      ativacao: graphql.field({
        type: graphql.JSON,
        resolve: (source) => source.ativacao,
      }),
    },
  }),
  args: {
    qrCodeData: graphql.arg({ type: graphql.nonNull(graphql.String) }),
    local: graphql.arg({ type: graphql.String }),
  },
  async resolve(source, { qrCodeData, local }, context: Context) {
    const userId = verificarAutenticacao(context)
    if (!userId) {
      return criarRespostaErro('Usuário não autenticado')
    }

    try {
      // Decodifica o QR code
      let qrPayload
      try {
        qrPayload = JSON.parse(qrCodeData)
      } catch (error) {
        return criarRespostaErro('QR Code inválido - formato incorreto')
      }

      // Valida estrutura do QR code
      if (!qrPayload.uuid || qrPayload.tipo !== 'ativacao_checkin') {
        return criarRespostaErro('QR Code inválido - dados incorretos')
      }

      // Busca a ativação pelo UUID
      const ativacao = await (context.query as any).Ativacao.findFirst({
        where: { uuid: { equals: qrPayload.uuid } },
        query: 'id nome pontuacao ativa evento { id evento }',
      })

      if (!ativacao) {
        return criarRespostaErro('QR Code inválido - ativação não encontrada')
      }

      // Verifica se a ativação está ativa
      if (ativacao.ativa !== 'ativa') {
        return criarRespostaErro('Esta ativação não está mais disponível')
      }

      // Verifica se o usuário já fez check-in nesta ativação
      const checkInExistente = await (context.query as any).CheckIn.findFirst({
        where: {
          AND: [
            { user: { id: { equals: userId } } },
            { ativacao: { id: { equals: ativacao.id } } },
          ],
        },
        query: 'id',
      })

      if (checkInExistente) {
        return criarRespostaErro('Você já realizou check-in nesta ativação')
      }

      // Cria o check-in
      const checkIn = await (context.query as any).CheckIn.createOne({
        data: {
          user: { connect: { id: userId } },
          ativacao: { connect: { id: ativacao.id } },
          pontosGanhos: ativacao.pontuacao,
          local: local || '',
        },
        query: 'id pontosGanhos createdAt user { id name } ativacao { id nome }',
      })

      // Busca a pontuação total atualizada do usuário
      const user = await context.query.User.findOne({
        where: { id: userId },
        query: 'pontuacaoTotal',
      })

      return criarRespostaSucesso(
        `Check-in realizado com sucesso! Você ganhou ${ativacao.pontuacao} pontos.`,
        { 
          checkIn, 
          pontuacaoTotal: user?.pontuacaoTotal || 0,
          ativacao: {
            id: ativacao.id,
            nome: ativacao.nome,
            pontuacao: ativacao.pontuacao,
            evento: ativacao.evento
          }
        }
      )
    } catch (error) {
      console.error('Erro ao escanear QR code:', error)
      return criarRespostaErro('Erro interno do servidor')
    }
  },
})
