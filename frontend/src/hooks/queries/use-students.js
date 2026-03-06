import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';

export const studentKeys = {
    all: ['students'],
    lists: () => [...studentKeys.all, 'list'],
    list: (filters) => [...studentKeys.lists(), { filters }],
    details: () => [...studentKeys.all, 'detail'],
    detail: (id) => [...studentKeys.details(), id],
};

export const useStudents = (filters) => {
    return useQuery({
        queryKey: studentKeys.list(filters),
        queryFn: () => apiGet('/admin/students', { params: filters }),
    });
};

export const useStudent = (id) => {
    return useQuery({
        queryKey: studentKeys.detail(id),
        queryFn: () => apiGet(`/admin/students/${id}`),
        enabled: !!id,
    });
};

export const useCreateStudent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (newStudent) => apiPost('/admin/students', newStudent),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
        },
    });
};

export const useUpdateStudent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }) => apiPut(`/admin/students/${id}`, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
            queryClient.invalidateQueries({ queryKey: studentKeys.detail(variables.id) });
        },
    });
};

export const useDeleteStudent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => apiDelete(`/admin/students/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
        },
    });
};
