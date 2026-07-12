import app from './app.js'

const port = Number(process.env.PORT || 8788)
app.listen(port, () => console.log(`[match-pulse] API listening on http://localhost:${port}`))
