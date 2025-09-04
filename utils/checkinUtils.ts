// utils/checkinUtils.ts
import type { Context } from '.keystone/types'
import * as QRCode from 'qrcode'

// Constantes
export const QR_CODE_CONFIG = {
    errorCorrectionLevel: 'M' as const,
    type: 'image/png' as const,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
    width: 300,
}

export const QR_CODE_TYPE = 'ativacao_checkin'

export const ERROR_MESSAGES = {
    NAO_AUTENTICADO: 'Usuário não autenticado',
    ATIVACAO_NAO_ENCONTRADA: 'Ativação não encontrada',
    ATIVACAO_INATIVA: 'Esta ativação não está mais disponível',
    CHECKIN_DUPLICADO: 'Você já realizou check-in nesta ativação',
    ERRO_INTERNO: 'Erro interno do servidor',
    QR_INVALIDO: 'QR Code inválido',
}

export const SUCCESS_MESSAGES = {
    CHECKIN_SUCESSO: (pontos: number) => `Check-in realizado com sucesso! Você ganhou ${pontos} pontos.`,
    QRCODE_SUCESSO: 'QR Code gerado com sucesso',
}

// Funções utilitárias
export function verificarAutenticacao(context: Context): string {
    const id = context.session?.itemId
    if (!id) {
        throw new Error(ERROR_MESSAGES.NAO_AUTENTICADO)
    }
    return id
}

export function criarRespostaErro(message: string): { success: boolean; message: string } {
    return { success: false, message }
}

export function criarRespostaSucesso<T>(message: string, data?: T): { success: boolean; message: string } & T {
    return { success: true, message, ...data } as { success: boolean; message: string } & T
}

export async function processarCheckIn(userId: string, ativacao: any, context: Context, local: any = ''): Promise<any> {
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
        return criarRespostaErro(ERROR_MESSAGES.CHECKIN_DUPLICADO)
    }

    const checkIn = await (context.query as any).CheckIn.createOne({
        data: {
            user: { connect: { id: userId } },
            ativacao: { connect: { id: ativacao.id } },
            pontosGanhos: ativacao.pontuacao,
            local,
        },
        query: 'id pontosGanhos createdAt user { id name } ativacao { id nome }',
    })

    const user = await context.query.User.findOne({
        where: { id: userId },
        query: 'pontuacaoTotal',
    })

    return criarRespostaSucesso(
        SUCCESS_MESSAGES.CHECKIN_SUCESSO(ativacao.pontuacao),
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
}

export async function gerarQRCodeDataURL(uuid: string, nomeAtivacao?: string): Promise<string> {
    try {
        const payload = {
            uuid,
            tipo: QR_CODE_TYPE,
            evento: nomeAtivacao,
            timestamp: Date.now(),
        }
        const qrString = JSON.stringify(payload)

        return QRCode.toDataURL(qrString, QR_CODE_CONFIG)
    } catch (error) {
        console.error('Erro ao gerar QR Code (DataURL):', error)
        throw new Error('Erro ao gerar QR Code')
    }
}

// Módulo de utilitários para check-in e QR Code
