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

// Tempo de expiração do QR Code em minutos (para evitar fraudes)
export const QR_CODE_EXPIRATION_MINUTES = 5

// Cache de UUIDs de QR Codes válidos (em produção usar Redis)
const qrCodeValidUUIDs = new Map<string, { ativacaoId: string; createdAt: number }>()

export const ERROR_MESSAGES = {
    NAO_AUTENTICADO: 'Usuário não autenticado',
    ATIVACAO_NAO_ENCONTRADA: 'Ativação não encontrada',
    ATIVACAO_INATIVA: 'Esta ativação não está mais disponível',
    CHECKIN_DUPLICADO: 'Você já realizou check-in nesta ativação',
    ERRO_INTERNO: 'Erro interno do servidor',
    QR_INVALIDO: 'QR Code inválido',
    QR_EXPIRADO: 'QR Code expirado. Solicite um novo QR Code ao promotor.',
    QR_UUID_INVALIDO: 'QR Code inválido ou expirado. Solicite um novo ao promotor.',
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

export function validarQRCodeExpirado(timestamp: number): boolean {
    const agora = Date.now()
    const tempoExpiracaoMs = QR_CODE_EXPIRATION_MINUTES * 60 * 1000
    const tempoDecorrido = agora - timestamp

    return tempoDecorrido > tempoExpiracaoMs
}

// Funções para gerenciar UUIDs válidos de QR Codes
export function gerarQRCodeUUID(): string {
    return `qr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export function armazenarQRCodeValido(qrUUID: string, ativacaoId: string): void {
    qrCodeValidUUIDs.set(qrUUID, {
        ativacaoId,
        createdAt: Date.now()
    })

    // Limpa UUIDs expirados para evitar memory leak
    limparQRCodesExpirados()
}

export function validarQRCodeUUID(qrUUID: string): { valido: boolean; ativacaoId?: string } {
    const qrData = qrCodeValidUUIDs.get(qrUUID)

    if (!qrData) {
        return { valido: false }
    }

    // Verifica se expirou
    if (validarQRCodeExpirado(qrData.createdAt)) {
        qrCodeValidUUIDs.delete(qrUUID) // Remove do cache
        return { valido: false }
    }

    return { valido: true, ativacaoId: qrData.ativacaoId }
}

export function invalidarQRCodeUUID(qrUUID: string): void {
    qrCodeValidUUIDs.delete(qrUUID)
}

export function limparQRCodesExpirados(): void {
    const agora = Date.now()
    const expirationMs = QR_CODE_EXPIRATION_MINUTES * 60 * 1000

    for (const [uuid, data] of qrCodeValidUUIDs.entries()) {
        if (agora - data.createdAt > expirationMs) {
            qrCodeValidUUIDs.delete(uuid)
        }
    }
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

export async function gerarQRCodeDataURL(uuid: string, ativacaoId: string): Promise<string> {
    try {
        // Gera UUID único para este QR Code específico
        const qrUUID = gerarQRCodeUUID()

        // Armazena no cache com dados da ativação
        armazenarQRCodeValido(qrUUID, ativacaoId)

        // URL para webapp com UUID do QR Code
        const webappURL = process.env.WEBAPP_URL || 'http://localhost:3000'
        const timestamp = Date.now()

        // Monta parâmetros com UUID único do QR Code
        const params = new URLSearchParams({
            qrUUID,              // UUID único do QR Code (para validação)
            uuid,                // UUID da ativação (para compatibilidade)
            ativacaoId,          // ID da ativação
            tipo: QR_CODE_TYPE,
            timestamp: timestamp.toString()
        })

        const qrString = `${webappURL}/checkin?${params.toString()}`

        return QRCode.toDataURL(qrString, QR_CODE_CONFIG)
    } catch (error) {
        console.error('Erro ao gerar QR Code (DataURL):', error)
        throw new Error('Erro ao gerar QR Code')
    }
}

export function extrairDadosDoQRCode(qrCodeData: string): { uuid: string; tipo?: string; timestamp?: number; ativacaoId?: string; qrUUID?: string } {
    try {
        let dadosExtraidos: { uuid: string; tipo?: string; timestamp?: number; ativacaoId?: string; qrUUID?: string }

        // Tenta primeiro como URL
        if (qrCodeData.includes('http')) {
            const url = new URL(qrCodeData)
            const uuid = url.searchParams.get('uuid')
            const tipo = url.searchParams.get('tipo')
            const timestamp = url.searchParams.get('timestamp')
            const ativacaoId = url.searchParams.get('ativacaoId')
            const qrUUID = url.searchParams.get('qrUUID')

            // Validação prioritária: UUID do QR Code (se presente)
            if (qrUUID) {
                const validacao = validarQRCodeUUID(qrUUID)
                if (!validacao.valido) {
                    throw new Error(ERROR_MESSAGES.QR_UUID_INVALIDO)
                }

                // QR Code válido - combina dados seguros do cache com dados da URL
                dadosExtraidos = {
                    uuid: uuid || '',                    // Da URL (compatibilidade)
                    tipo: tipo || undefined,             // Da URL (compatibilidade) 
                    timestamp: timestamp ? parseInt(timestamp) : undefined, // Da URL (auditoria)
                    ativacaoId: validacao.ativacaoId,    // DO CACHE (dado seguro)
                    qrUUID                               // Da URL (identificador)
                }
            } else {
                // Formato antigo sem qrUUID - validação por timestamp
                if (!uuid) {
                    throw new Error('UUID não encontrado na URL')
                }

                dadosExtraidos = {
                    uuid,
                    tipo: tipo || undefined,
                    timestamp: timestamp ? parseInt(timestamp) : undefined,
                    ativacaoId: ativacaoId || undefined
                }

                // Validação de expiração para formato antigo
                if (dadosExtraidos.timestamp && validarQRCodeExpirado(dadosExtraidos.timestamp)) {
                    throw new Error(ERROR_MESSAGES.QR_EXPIRADO)
                }
            }
        } else {
            // Tenta como JSON (formato muito antigo)
            const payload = JSON.parse(qrCodeData)
            if (payload.uuid) {
                dadosExtraidos = {
                    uuid: payload.uuid,
                    tipo: payload.tipo,
                    timestamp: payload.timestamp,
                    ativacaoId: payload.ativacaoId
                }

                // Validação de expiração para JSON antigo
                if (dadosExtraidos.timestamp && validarQRCodeExpirado(dadosExtraidos.timestamp)) {
                    throw new Error(ERROR_MESSAGES.QR_EXPIRADO)
                }
            } else {
                throw new Error('Formato não reconhecido')
            }
        }

        return dadosExtraidos

    } catch (error) {
        // Propaga erros específicos
        const errorMessage = (error as Error).message
        if (errorMessage === ERROR_MESSAGES.QR_EXPIRADO ||
            errorMessage === ERROR_MESSAGES.QR_UUID_INVALIDO) {
            throw error
        }
        throw new Error('QR Code inválido - formato não reconhecido')
    }
}
