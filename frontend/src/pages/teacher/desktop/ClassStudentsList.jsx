import { useState, useEffect } from 'react';
import api from '../../../services/api';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import EmptyState from '../../../components/ui/EmptyState';
import './ClassStudentsList.css';

export default function ClassStudentsList({ classId }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (classId) {
      loadStudents();
    }
  }, [classId]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      // Extract actual class ID from classId (handle both "10" and "online_10" formats)
      let actualClassId = classId;
      if (typeof classId === 'string' && classId.startsWith('online_')) {
        actualClassId = classId.replace('online_', '');
      }
      // Teacher classes are ONLINE classes => use enrollments API
      const response = await api.getOnlineClassEnrollments(actualClassId);
      if (response?.success) {
        const list = Array.isArray(response.data)
          ? response.data
          : (Array.isArray(response.data?.data) ? response.data.data : []);
        setStudents(list || []);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error('Error loading students:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return <LoadingSpinner text="Đang tải danh sách học viên..." />;
  }

  if (students.length === 0) {
    return (
      <EmptyState
        icon="👥"
        title="Chưa có học viên"
        message="Lớp này chưa có học viên nào đăng ký."
      />
    );
  }

  return (
    <div className="class-students-list">
      <div className="students-header">
        <h3>Danh sách học viên ({students.length})</h3>
      </div>
      <div className="table-container">
        <table className="table-teacher">
          <thead>
            <tr>
              <th>STT</th>
              <th>CCCD</th>
              <th>Họ tên</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => (
              <tr key={student.registration_id || student.id}>
                <td>{index + 1}</td>
                <td><strong>{student.cccd}</strong></td>
                <td><strong>{student.ho_ten_full}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}






