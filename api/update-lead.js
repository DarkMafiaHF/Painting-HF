import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

const app = initializeApp(JSON.parse(process.env.FIREBASE_CONFIG));
const db = getFirestore(app);

export default async function handler(req, res) {
  if (req.headers.authorization !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { id } = req.body;

  await updateDoc(doc(db, "leads", id), {
    status: "replied"
  });

  res.json({ success: true });
}