import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { qrData, userId } = req.body

      if (!qrData || !userId) {
        return res.status(400).json({ 
          error: 'Dados do QR code e ID do usuário são obrigatórios' 
        })
      }

      // Decodificar os dados do QR code
      let checkInData
      try {
        checkInData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData
      } catch (error) {
        return res.status(400).json({ error: 'QR code inválido' })
      }

      // Verificar se é um QR code de check-in válido
      if (checkInData.tipo !== 'checkin') {
        return res.status(400).json({ error: 'QR code não é válido para check-in' })
      }

      // Verificar se o evento existe e está ativo
      if (checkInData.eventoId) {
        const evento = await prisma.events.findUnique({
          where: { id: checkInData.eventoId }
        })

        if (!evento) {
          return res.status(404).json({ error: 'Evento não encontrado' })
        }

        if (evento.status === 'cancelado') {
          return res.status(400).json({ error: 'Este evento foi cancelado' })
        }

        // Verificar se o evento já passou (mais de 24 horas após a data)
        const eventoDate = new Date(evento.data)
        const now = new Date()
        const diffHours = (now.getTime() - eventoDate.getTime()) / (1000 * 60 * 60)
        
        if (diffHours > 24) {
          return res.status(400).json({ error: 'Este evento já expirou' })
        }
      }

      // Verificar se o usuário existe
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' })
      }

      // Verificar se já não fez check-in neste evento recentemente (evitar spam)
      const recentCheckIn = await prisma.checkIn.findFirst({
        where: {
          userId,
          local: checkInData.local,
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // 5 minutos atrás
          }
        }
      })

      if (recentCheckIn) {
        return res.status(400).json({ 
          error: 'Você já fez check-in neste local recentemente. Aguarde alguns minutos.' 
        })
      }

      // Criar o check-in
      const checkIn = await prisma.checkIn.create({
        data: {
          userId,
          pontosGanhos: checkInData.pontos,
          local: checkInData.local
        }
      })

      // Atualizar os pontos do usuário
      await prisma.user.update({
        where: { id: userId },
        data: {
          pontos: user.pontos + checkInData.pontos
        }
      })

      res.status(200).json({
        success: true,
        message: `Check-in realizado com sucesso em ${checkInData.local}! +${checkInData.pontos} pontos`,
        checkIn,
        pontosAtuais: user.pontos + checkInData.pontos,
        evento: checkInData.evento,
        eventoId: checkInData.eventoId
      })

    } catch (error) {
      console.error('Erro no scan do QR code:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}

