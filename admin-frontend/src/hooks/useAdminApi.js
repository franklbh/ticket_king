import { useEffect, useId, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../components/ToastProvider'

export function useAdminQuery(loader, deps = [], options = {}) {
  const id = useId()
  const toast = useToast()
  const queryClient = useQueryClient()
  const queryKey = useMemo(() => options.queryKey || ['admin-query', id, ...deps], [id, options.queryKey, ...deps])

  const query = useQuery({
    queryKey,
    queryFn: loader,
    placeholderData: options.initialData,
    staleTime: options.staleTime ?? 0,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
  })

  useEffect(() => {
    if (query.error) toast.error(query.error.message || 'Admin API request failed.')
  }, [query.error, toast])

  return {
    data: query.data,
    error: query.error,
    loading: query.isPending || query.isPlaceholderData || (query.isFetching && !query.data),
    fetching: query.isFetching,
    reload: query.refetch,
    setData: updater => queryClient.setQueryData(queryKey, updater),
  }
}

export function useAdminMutation(action, options = {}) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: args => action(...args),
    onSuccess: data => {
      if (options.successMessage) toast.success(options.successMessage)
      if (options.invalidateQueries) queryClient.invalidateQueries({ queryKey: options.invalidateQueries })
      options.onSuccess?.(data)
    },
    onError: err => {
      toast.error(err?.message || 'Admin API request failed.')
      options.onError?.(err)
    },
  })

  return {
    mutate: (...args) => mutation.mutateAsync(args),
    loading: mutation.isPending,
    error: mutation.error,
  }
}
