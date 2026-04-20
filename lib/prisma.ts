import { PrismaClient } from "@prisma/client"
import fs from "fs"
import path from "path"

if (process.env.NODE_ENV === "test") {
  const envPath = path.resolve(process.cwd(), ".env.test")
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n")
    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match) {
        process.env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, "")
      }
    }
  }
}

console.log("DB USADA:", process.env.DATABASE_URL)

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
})

export default prisma