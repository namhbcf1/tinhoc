import StudentExamsView from '../../../features/student/views/StudentExamsView';

export default function StudentExams({ studentData }: { studentData: any }) {
  return <StudentExamsView studentData={studentData} compact={false} />;
}
