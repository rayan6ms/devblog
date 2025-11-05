import dbConnect from "@/database/dbConnect";
import Post from "@/../models/Post";

export async function GET() {
  await dbConnect();
  const weekAgo = new Date(Date.now() - 7*24*60*60*1000);
  const posts = await Post.find({ status: "published", createdAt: { $gte: weekAgo } })
    .sort({ views: -1, bookmarks: -1 })
    .limit(10)
    .lean();
  return Response.json(posts);
}