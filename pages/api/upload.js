import nextConnect from 'next-connect'
import multer from 'multer'
import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions } from '@azure/storage-blob'
import { v4 as uuidv4 } from 'uuid'
require('dotenv').config()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MBの制限
})

const apiRoute = nextConnect({
  onError(error, req, res) {
    res.status(501).json({ error: `Sorry something Happened! ${error.message}` })
  },
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` })
  }
})

apiRoute.use(upload.single('file'))

apiRoute.post(async (req, res) => {
  const file = req.file
  if (!file) {
    return res.status(400).json({ error: 'No file part' })
  }

  const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING
  if (!AZURE_STORAGE_CONNECTION_STRING) {
    console.error('AZURE_STORAGE_CONNECTION_STRING not found')
    return res.status(500).json({ error: 'AZURE_STORAGE_CONNECTION_STRING not found' })
  }
  const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING)
  const containerName = req.query.type === 'video' ? 'videos' : 'images'
  const containerClient = blobServiceClient.getContainerClient(containerName)

  const allowedFile = (filename, type) => {
    const ALLOWED_EXTENSIONS = type === 'video' ? ['mp4', 'avi', 'mov'] : ['jpg', 'jpeg', 'png', 'gif']
    return ALLOWED_EXTENSIONS.includes(filename.split('.').pop().toLowerCase())
  }

  if (!allowedFile(file.originalname, req.query.type)) {
    return res.status(400).json({ error: 'File type not allowed' })
  }

  try {
    const filename = uuidv4() + '.' + file.originalname.split('.').pop()
    const blockBlobClient = containerClient.getBlockBlobClient(filename)
    await blockBlobClient.uploadData(file.buffer)

    // SASトークンを生成
    const sasOptions = {
      containerName,
      blobName: filename,
      permissions: BlobSASPermissions.parse('r'),
      expiresOn: new Date(new Date().valueOf() + 3600 * 1000) // 1時間後に期限切れ
    }

    const sasToken = generateBlobSASQueryParameters(sasOptions, blobServiceClient.credential).toString()
    const sasUrl = `${blockBlobClient.url}?${sasToken}`

    res.json({ url: sasUrl })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export const config = {
  api: {
    bodyParser: false
  }
}

export default apiRoute
