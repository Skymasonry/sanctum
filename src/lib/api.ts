import http from "http"

interface FetchOptions {
  headers?: Record<string, string>
}

export function fetchFromNextcloud<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: "nextcloud",
      port: 80,
      path: path,
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Host": "brothers.skymasons.xyz",
        ...options.headers,
      },
    }

    const req = http.request(reqOptions, (res) => {
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data))
          } catch {
            reject(new Error("Invalid JSON response"))
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`))
        }
      })
    })

    req.on("error", reject)
    req.end()
  })
}

export function postToNextcloud<T = unknown>(
  path: string,
  body: unknown,
  options: FetchOptions = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body)
    
    const reqOptions = {
      hostname: "nextcloud",
      port: 80,
      path: path,
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        "Host": "brothers.skymasons.xyz",
        ...options.headers,
      },
    }

    const req = http.request(reqOptions, (res) => {
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve((data ? JSON.parse(data) : {}) as T)
          } catch {
            resolve({} as T)
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`))
        }
      })
    })

    req.on("error", reject)
    req.write(postData)
    req.end()
  })
}

// Client-side fetcher for SWR
export async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json()
}
