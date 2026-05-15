import { API_URL } from './config'

export async function testDatabaseConnection() {
  const response = await fetch(`${API_URL}/test-db`)

  if (!response.ok) {
    throw new Error(`Database test failed with status ${response.status}`)
  }

  return response.json()
}
