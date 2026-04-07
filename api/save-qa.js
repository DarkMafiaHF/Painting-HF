import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc, addDoc } from "firebase/firestore";

const app = initializeApp(JSON.parse(process.env.FIREBASE_CONFIG));
const db = getFirestore(app);

export default async function handler(req, res) {
  if (req.headers.authorization !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { items } = req.body;

  const snap = await getDocs(collection(db, "qa"));
  for (const d of snap.docs) {
    await deleteDoc(doc(db, "qa", d.id));
  }

  for (const item of items) {
    await addDoc(collection(db, "qa"), item);
  }

  res.json({ success: true });
}