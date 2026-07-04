import { redirect } from 'next/navigation';

// Study material is now unified into the main Learn page
export default function StudentStudyPage() {
  redirect('/student');
}
