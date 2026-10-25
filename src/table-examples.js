/* Sample tables for the Tables page. Data is invented for teaching. */
(function (root) {
  const TABLE_EXAMPLES = [
    { id: 'reg', label: 'VIT course registrations (partial + transitive dependencies)', name: 'Registration',
      csv: `regno,name,hostel,warden,course,title,credits,grade
25BCE1001,Arjun,A Block,Dr. Rao,BACSE202,Database Systems,4,S
25BCE1001,Arjun,A Block,Dr. Rao,BACSE106,Operating Systems,4,A
25BCE1001,Arjun,A Block,Dr. Rao,BAMAT201,Discrete Mathematics,3,B
25BCE1002,Meera,C Block,Dr. Iyer,BACSE202,Database Systems,4,A
25BCE1002,Meera,C Block,Dr. Iyer,BACSE201,Models of Computation,3,S
25BCE1003,Kabir,A Block,Dr. Rao,BACSE202,Database Systems,4,B
25BCE1003,Kabir,A Block,Dr. Rao,BACSE106,Operating Systems,4,C
25BCE1004,Divya,D Block,Dr. Khan,BACSE201,Models of Computation,3,A
25BCE1004,Divya,D Block,Dr. Khan,BAMAT201,Discrete Mathematics,3,S
25BCE1005,Rahul,C Block,Dr. Iyer,BACSE106,Operating Systems,4,A`,
      pk: 'regno, course', fds: ['regno -> name, hostel', 'hostel -> warden', 'course -> title, credits'],
      names: { regno: 'Student', hostel: 'Hostel', course: 'Course', 'regno, course': 'Registration' } },
    { id: 'clubs', label: 'Student contacts with lists in cells (1NF and 4NF)', name: 'StudentContact',
      csv: `regno,name,phones,clubs
25BCE1001,Arjun,"98400 11111; 98400 22222","Robotics; Music"
25BCE1002,Meera,97100 33333,Drama
25BCE1003,Kabir,"99620 44444; 99620 55555","Robotics; Quiz; Music"
25BCE1004,Divya,90030 66666,"Music; Drama"`,
      pk: null, fds: ['regno -> name'],
      names: { regno: 'Student', 'regno, phone': 'StudentPhone', 'regno, club': 'StudentClub', 'regno, phone, club': 'StudentContact' } },
    { id: 'groups', label: 'Marks sheet with repeating columns (course1, grade1, …)', name: 'MarkSheet',
      csv: `rollno,name,section,course1,grade1,course2,grade2,course3,grade3
21BCE0101,Ananya,A1,BACSE202,S,BACSE106,A,,
21BCE0102,Vikram,A1,BACSE202,B,BAMAT201,A,BACSE106,C
21BCE0103,Sana,B2,BACSE201,A,,,,
21BCE0104,Rohit,B2,BACSE202,A,BACSE201,B,,
21BCE0102,Vikram,A1,BACSE202,B,BAMAT201,A,BACSE106,C`,
      pk: 'rollno, course', fds: ['rollno -> name, section'],
      names: { rollno: 'Student', 'rollno, course': 'Result' } },
    { id: 'teach', label: 'Who teaches whom (3NF but not BCNF)', name: 'Teaching',
      csv: `student,subject,teacher
Arjun,DBMS,Dr. Rao
Arjun,OS,Dr. Priya
Meera,DBMS,Dr. Lakshmi
Meera,OS,Dr. Priya
Kabir,DBMS,Dr. Rao
Kabir,OS,Dr. Kumar
Divya,DBMS,Dr. Lakshmi
Divya,OS,Dr. Kumar`,
      pk: 'student, subject', fds: ['teacher -> subject', 'student, subject -> teacher'],
      names: { teacher: 'TeacherSubject', 'student, teacher': 'StudentTeacher', 'student, subject': 'Teaching' } },
    { id: 'orders', label: 'Online orders (transitive chain)', name: 'OrderLine',
      csv: `order_id,order_date,cust_id,cust_name,city,pincode,product_id,product_name,unit_price,qty
O1001,2026-09-01,C01,Asha,Chennai,600127,P10,USB Cable,199.00,2
O1001,2026-09-01,C01,Asha,Chennai,600127,P11,Mouse,549.00,1
O1002,2026-09-02,C02,Ravi,Vellore,632014,P10,USB Cable,199.00,3
O1003,2026-09-02,C01,Asha,Chennai,600127,P12,Keyboard,1299.00,1
O1004,2026-09-03,C03,Neha,Chennai,600127,P11,Mouse,549.00,2
O1004,2026-09-03,C03,Neha,Chennai,600127,P12,Keyboard,1299.00,1
O1005,2026-09-04,C02,Ravi,Vellore,632014,P11,Mouse,549.00,1`,
      pk: 'order_id, product_id', fds: ['order_id -> order_date, cust_id', 'cust_id -> cust_name, pincode', 'pincode -> city', 'product_id -> product_name, unit_price'],
      names: { order_id: 'Orders', cust_id: 'Customer', pincode: 'Pincode', product_id: 'Product', 'order_id, product_id': 'OrderLine' } }
  ];
  root.TABLE_EXAMPLES = TABLE_EXAMPLES;
  if (typeof module !== 'undefined') module.exports = TABLE_EXAMPLES;
})(typeof window !== 'undefined' ? window : globalThis);
