import StudentExamsView from '../../../features/student/views/StudentExamsView';

export default function MobileExamsModule({ studentData }: { studentData: any }) {
  return <StudentExamsView studentData={studentData} compact />;
}
