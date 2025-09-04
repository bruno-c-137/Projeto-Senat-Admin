import { graphql } from '@keystone-6/core'
import type { Context } from '.keystone/types'
import {
  QR_CODE_TYPE,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  verificarAutenticacao,
  criarRespostaErro,
  processarCheckIn,
  gerarQRCodeDataURL,
} from '../utils/checkinUtils'

type QRCodePayload = {
  uuid: string
  tipo: 'ativacao_checkin'
  evento?: string
  timestamp: number
}

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

      if (!ativacao) return criarRespostaErro(`${ERROR_MESSAGES.QR_INVALIDO} - ativação não encontrada`)

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
      return criarRespostaErro(ERROR_MESSAGES.ERRO_INTERNO)
    }
  },
})

// Query para buscar histórico de check-ins do usuário
export const meuHistoricoCheckins = graphql.field({
  type: graphql.list(graphql.JSON),
  async resolve(source, args, context: Context) {
    const userId = verificarAutenticacao(context)
    if (!userId) throw new Error(ERROR_MESSAGES.NAO_AUTENTICADO)

    const checkIns = await (context.query as any).CheckIn.findMany({
      where: { user: { id: { equals: userId } } },
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

// Mutation mesclada para gerar QR Code
export const gerarQRCodeAtivacao = graphql.field({
  type: graphql.object<{
    success: boolean
    message: string
    qrCodeDataURL?: string
  }>()({
    name: 'QRCodeResult',
    fields: {
      success: graphql.field({ type: graphql.nonNull(graphql.Boolean) }),
      message: graphql.field({ type: graphql.nonNull(graphql.String) }),
      qrCodeDataURL: graphql.field({ type: graphql.String }),
    },
  }),
  args: {
    ativacaoId: graphql.arg({ type: graphql.nonNull(graphql.ID) }),
  },
  async resolve(source, { ativacaoId }, context: Context) {
    const userId = verificarAutenticacao(context)
    if (!userId) return { success: false, message: ERROR_MESSAGES.NAO_AUTENTICADO }

    try {
      // Busca a ativação existente
      const ativacao = await (context.query as any).Ativacao.findOne({
        where: { id: ativacaoId },
        query: 'id nome uuid ativa evento { evento }',
      })

      if (!ativacao) return { success: false, message: ERROR_MESSAGES.ATIVACAO_NAO_ENCONTRADA }

      const nomeEvento = ativacao.evento?.evento || ativacao.nome
      const qrCodeDataURL = await gerarQRCodeDataURL(ativacao.uuid, nomeEvento)

      return {
        success: true,
        message: SUCCESS_MESSAGES.QRCODE_SUCESSO,
        qrCodeDataURL,
      }
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error)
      return { success: false, message: ERROR_MESSAGES.ERRO_INTERNO }
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
    if (!userId) return criarRespostaErro(ERROR_MESSAGES.NAO_AUTENTICADO)

    try {
      let qrPayload: QRCodePayload
      try {
        qrPayload = JSON.parse(qrCodeData)
      } catch (error) {
        return criarRespostaErro(`${ERROR_MESSAGES.QR_INVALIDO} - formato incorreto`)
      }

      if (!qrPayload.uuid || qrPayload.tipo !== QR_CODE_TYPE) {
        return criarRespostaErro(`${ERROR_MESSAGES.QR_INVALIDO} - dados incorretos`)
      }

      const ativacao = await (context.query as any).Ativacao.findFirst({
        where: { uuid: { equals: qrPayload.uuid } },
        query: 'id nome pontuacao ativa evento { id evento }',
      })

      if (!ativacao) return criarRespostaErro(`${ERROR_MESSAGES.QR_INVALIDO} - ativação não encontrada`)
      if (ativacao.ativa !== 'ativa') return criarRespostaErro(ERROR_MESSAGES.ATIVACAO_INATIVA)

      return processarCheckIn(userId, ativacao, context, local)
    } catch (error) {
      console.error('Erro ao escanear QR code:', error)
      return criarRespostaErro(ERROR_MESSAGES.ERRO_INTERNO)
    }
  },
})
