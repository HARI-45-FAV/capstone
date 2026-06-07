const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const semId = 'cd3ef7d0-45b4-4df6-9910-79f626af1f3b';
  
  // Count students with this semesterId
  const count = await p.student.count({ where: { semesterId: semId, isDeleted: false } });
  console.log('Students with this semesterId (not deleted):', count);

  // Try fetching them directly
  const students = await p.student.findMany({
    where: { semesterId: semId, isDeleted: false },
    select: { name: true, rollNo: true, email: true },
    take: 5
  });
  console.log('Direct fetch sample:', JSON.stringify(students, null, 2));

  // Now try via course -> semester -> students (current controller approach)
  const courseId = '8cd69903-4ce7-4192-9d29-a8c841b939f0'; // computer networks
  const course = await p.course.findUnique({
    where: { id: courseId },
    include: {
      semester: {
        include: {
          students: {
            where: { isDeleted: false },
            orderBy: { rollNo: 'asc' }
          }
        }
      }
    }
  });
  console.log('Via course->semester->students count:', course?.semester?.students?.length);
  if (course?.semester?.students?.length > 0) {
    console.log('First student:', course.semester.students[0].name);
  }
}
main().then(() => p.$disconnect()).catch(e => { console.error(e.message); p.$disconnect(); });
