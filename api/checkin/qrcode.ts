import { NextApiRequest, NextApiResponse } from 'next'
import QRCode from 'qrcode'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { local, evento } = req.query

      if (!evento) {
        return res.status(400).json({ error: 'ID do evento é obrigatório' })
      }

      // Buscar o evento no banco de dados
      const eventoData = await prisma.events.findUnique({
        where: { id: evento as string }
      })

      if (!eventoData) {
        return res.status(404).json({ error: 'Evento não encontrado' })
      }

      // Criar dados para o QR code usando os pontos definidos pelo admin
      const qrData = {
        tipo: 'checkin',
        local: local || eventoData.local || 'Local não especificado',
        pontos: eventoData.pontos,
        evento: eventoData.evento,
        eventoId: eventoData.id,
        timestamp: new Date().toISOString()
      }

      // Gerar o QR code como SVG
      const qrCodeSVG = await QRCode.toString(JSON.stringify(qrData), {
        type: 'svg',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      res.setHeader('Content-Type', 'image/svg+xml')
      res.status(200).send(qrCodeSVG)

    } catch (error) {
      console.error('Erro ao gerar QR code:', error)
      res.status(500).json({ error: 'Erro ao gerar QR code' })
    }
  } else if (req.method === 'POST') {
    try {
      const { local, evento } = req.body

      if (!evento) {
        return res.status(400).json({ error: 'ID do evento é obrigatório' })
      }

      // Buscar o evento no banco de dados
      const eventoData = await prisma.events.findUnique({
        where: { id: evento }
      })

      if (!eventoData) {
        return res.status(404).json({ error: 'Evento não encontrado' })
      }

      // Criar dados para o QR code usando os pontos definidos pelo admin
      const qrData = {
        tipo: 'checkin',
        local: local || eventoData.local || 'Local não especificado',
        pontos: eventoData.pontos,
        evento: eventoData.evento,
        eventoId: eventoData.id,
        timestamp: new Date().toISOString()
      }

      // Gerar o QR code como base64 PNG
      const qrCodeBase64 = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      res.status(200).json({
        success: true,
        qrCode: qrCodeBase64,
        data: qrData
      })

    } catch (error) {
      console.error('Erro ao gerar QR code:', error)
      res.status(500).json({ error: 'Erro ao gerar QR code' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}

