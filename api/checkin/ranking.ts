import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Buscar todos os usuários com seus check-ins e ordenar por pontos
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          pontos: true,
          checkIns: {
            select: {
              id: true,
              pontosGanhos: true,
              local: true,
              createdAt: true
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        },
        orderBy: {
          pontos: 'desc'
        }
      })

      // Calcular estatísticas
      const totalUsers = users.length
      const totalPontos = users.reduce((sum, user) => sum + user.pontos, 0)
      const mediaPontos = totalUsers > 0 ? Math.round(totalPontos / totalUsers) : 0

      // Top 3 usuários
      const top3 = users.slice(0, 3)

      res.status(200).json({
        success: true,
        data: {
          users,
          top3,
          estatisticas: {
            totalUsers,
            totalPontos,
            mediaPontos
          }
        }
      })

    } catch (error) {
      console.error('Erro ao buscar ranking:', error)
      res.status(500).json({ error: 'Erro interno do servidor' })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}

