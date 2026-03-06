import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';

export const classKeys = {
    all: ['classes'],
    lists: () => [...classKeys.all, 'list'],
    list: (filters) => [...classKeys.lists(), { ...filters }],
    details: () => [...classKeys.all, 'detail'],
    detail: (id) => [...classKeys.details(), id],
};

export const useClasses = (filters) => {
    return useQuery({
        queryKey: classKeys.list(filters),
        queryFn: () => apiGet('/admin/classes', { params: filters }),
    });
};

export const useClass = (id) => {
    return useQuery({
        queryKey: classKeys.detail(id),
        queryFn: () => apiGet(`/admin/classes/${id}`),
        enabled: !!id,
    });
};

export const useCreateClass = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (newClass) => apiPost('/admin/classes', newClass),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: classKeys.lists() });
        },
    });
};

export const useUpdateClass = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }) => apiPut(`/admin/classes/${id}`, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: classKeys.lists() });
            queryClient.invalidateQueries({ queryKey: classKeys.detail(variables.id) });
        },
    });
};

export const useDeleteClass = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => apiDelete(`/admin/classes/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: classKeys.lists() });
        },
    });
};
