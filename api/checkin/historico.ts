import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { userId } = req.query

      if (!userId) {
        return res.status(400).json({ error: 'ID do usuário é obrigatório' })
      }

      // Verificar se o usuário existe
      const user = await prisma.user.findUnique({
        where: { id: userId as string },
        select: {
          id: true,
          name: true,
          email: true,
          pontos: true
        }
      })

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' })
      }

      // Buscar histórico de check-ins do usuário
      const checkIns = await prisma.checkIn.findMany({
        where: { userId: userId as string },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          pontosGanhos: true,
          local: true,
          createdAt: true
        }
      })

      // Calcular estatísticas do usuário
      const totalCheckIns = checkIns.length
      const totalPontosGanhos = checkIns.reduce((sum, checkIn) => sum + checkIn.pontosGanhos, 0)
      const checkInsPorLocal = checkIns.reduce((acc, checkIn) => {
        acc[checkIn.local] = (acc[checkIn.local] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      res.status(200).json({
        success: true,
        data: {
          usuario: user,
          checkIns,
          estatisticas: {
            totalCheckIns,
            totalPontosGanhos,
            checkInsPorLocal,
            pontosAtuais: user.pontos
          }
        }
      })

    } catch (error) {
      console.error('Erro ao buscar histórico:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}

