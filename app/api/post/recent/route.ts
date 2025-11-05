import dbConnect from "@/database/dbConnect";
import Post from "@/../models/Post";

export async function GET() {
  await dbConnect();
  const posts = await Post.find({ status: "published" })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  return Response.json(posts);
}