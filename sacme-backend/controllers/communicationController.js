const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const nodemailer = require('nodemailer');

exports.getContactRoster = async (req, res) => {
    try {
        const { courseId } = req.params;

        // Students are linked to courses via Semester (same pattern as getCourseStudents)
        const course = await prisma.course.findUnique({
            where: { id: courseId, isDeleted: false },
            include: {
                semester: {
                    include: {
                        students: {
                            where: { isDeleted: false },
                            orderBy: { rollNo: 'asc' },
                            include: { user: true }
                        }
                    }
                }
            }
        });

        if (!course || !course.semester) return res.json({ roster: [] });

        const students = course.semester.students;
        if (!students.length) return res.json({ roster: [] });

        // Build roster — name, rollNo, email only (no attendance/assignment overhead)
        const roster = students.map(st => ({
            id: st.id,
            userId: st.userId,
            name: st.name,
            rollNo: st.rollNo,
            email: st.email || (st.user && st.user.email) || ""
        }));

        res.json({ roster });
    } catch (error) {
        console.error("Contact Roster Error:", error);
        res.status(500).json({ error: "Failed to load contact roster" });
    }
};

exports.sendCustomEmail = async (req, res) => {
    try {
        const { recipients, subject, message, courseId } = req.body;
        
        if (!recipients || !recipients.length || !subject || !message) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        let successCount = 0;
        let failCount = 0;

        for (const recipient of recipients) {
            if (!recipient.email || recipient.email === "N/A" || recipient.email === "") {
                failCount++;
                continue;
            }
            
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: recipient.email,
                    subject: subject,
                    html: `<p>${message.replace(/\n/g, '<br>')}</p>`
                });
                successCount++;

                await prisma.emailLog.create({
                    data: {
                        studentId: recipient.id,
                        courseId: courseId || null,
                        alertType: 'CUSTOM_EMAIL',
                        recipient: recipient.email,
                        subject: subject,
                        status: 'SUCCESS'
                    }
                });
            } catch (err) {
                console.error(`Failed to send to ${recipient.email}:`, err);
                failCount++;
                
                await prisma.emailLog.create({
                    data: {
                        studentId: recipient.id,
                        courseId: courseId || null,
                        alertType: 'CUSTOM_EMAIL',
                        recipient: recipient.email,
                        subject: subject,
                        status: 'FAILED',
                        errorMessage: err.message.substring(0, 200)
                    }
                });
            }
        }

        res.json({ success: true, message: `Sent: ${successCount}. Failed: ${failCount}` });
    } catch (err) {
        console.error("Send Email Error:", err);
        res.status(500).json({ error: "Failed to send emails" });
    }
};
