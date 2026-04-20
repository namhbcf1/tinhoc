import StudentReviewsView from '../desktop/StudentReviewsView';

/** Mobile: dùng cùng view, compact mode + không sticky header (mobile layout đã có header riêng) */
export default function StudentReviewsMobileView() {
  return <StudentReviewsView compact />;
}
