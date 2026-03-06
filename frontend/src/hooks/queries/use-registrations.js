import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';

export const registrationKeys = {
    all: ['registrations'],
    lists: () => [...registrationKeys.all, 'list'],
    list: (filters) => [...registrationKeys.lists(), { ...filters }],
    details: () => [...registrationKeys.all, 'detail'],
    detail: (id) => [...registrationKeys.details(), id],
};

export const useRegistrations = (filters) => {
    return useQuery({
        queryKey: registrationKeys.list(filters),
        queryFn: () => apiGet('/admin/registrations', { params: filters }),
    });
};

export const useRegistration = (id) => {
    return useQuery({
        queryKey: registrationKeys.detail(id),
        queryFn: () => apiGet(`/admin/registrations/${id}`),
        enabled: !!id,
    });
};

export const useCreateRegistration = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (newRegistration) => apiPost('/admin/registrations', newRegistration),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: registrationKeys.lists() });
        },
    });
};

export const useUpdateRegistration = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }) => apiPut(`/admin/registrations/${id}`, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: registrationKeys.lists() });
            queryClient.invalidateQueries({ queryKey: registrationKeys.detail(variables.id) });
        },
    });
};

export const useDeleteRegistration = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => apiDelete(`/admin/registrations/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: registrationKeys.lists() });
        },
    });
};
