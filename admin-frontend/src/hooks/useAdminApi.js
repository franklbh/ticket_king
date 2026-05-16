import { useCallback, useEffect, useState, useTransition } from 'react'

export function useAdminQuery(loader, deps = [], options = {}) {
  const [data, setData] = useState(options.initialData ?? null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [, startTransition] = useTransition()

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await loader()
      startTransition(() => setData(next))
      return next
    } catch (err) {
      setError(err)
      return null
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    loader()
      .then(next => {
        if (active) startTransition(() => setData(next))
      })
      .catch(err => {
        if (!active) return
        setError(err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, deps)

  return { data, error, loading, reload, setData }
}

export function useAdminMutation(action) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const mutate = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      return await action(...args)
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [action])

  return { mutate, loading, error }
}
