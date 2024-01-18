import mongoose from 'mongoose';
import { Post, Feedback, User, Comment, Progress } from '../../models';
import { IPost, IFeedback, IUser, IComment, IProgress } from './types';
import dbConnect from '@/database/dbConnect';

interface TagCount {
  [key: string]: number;
}

export async function getPostBySlug(slug: string): Promise<mongoose.Document | null> {
  await dbConnect();
  return await Post.findOne({ slug }).populate('author').exec();
}

export async function getUserBySlug(slug: string): Promise<mongoose.Document | null> {
  await dbConnect();
  return await User.findOne({ slug }).exec();
}

export async function getCommentsByPostSlug(slug: string): Promise<IComment[] | null> {
  await dbConnect();
  const post = await Post.findOne({ slug }).exec();
  if (!post) return null;
  return await Comment.find({ _id: { $in: post.comments } }).populate('author').exec() as IComment[];
}

export async function getProgress(
  userId: mongoose.Types.ObjectId,
  postId: mongoose.Types.ObjectId
): Promise<mongoose.Document | null> {
  await dbConnect();
  return await Progress.findOne({ user: userId, post: postId }).exec();
}

export async function getTrendingPosts(): Promise<mongoose.Document[]> {
  await dbConnect();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const trendingPosts = await Post.find({
    createdAt: { $gte: oneWeekAgo }
  }).sort({ views: -1, bookmarks: -1 }).limit(10);
  return trendingPosts;
}

export async function getRecentPosts(): Promise<mongoose.Document[]> {
  await dbConnect();
  const recentPosts = await Post.find().sort({ createdAt: -1 }).limit(10);
  return recentPosts;
}

export async function getRecommendationsBasedOnFeedback(userId: mongoose.Types.ObjectId): Promise<mongoose.Document[]> {
  await dbConnect();
  const userFeedback = await Feedback.find({ userId });
  const wantMorePosts = userFeedback.filter(feedback => feedback.wantMore).map(feedback => feedback.postId);
  const wantLessPosts = userFeedback.filter(feedback => feedback.wantLess).map(feedback => feedback.postId);
  const wantMoreAuthorsAndTags = await Post.find({ _id: { $in: wantMorePosts } }, 'author tags');
  const similarToWantMore = await Post.find({
    $or: [
      { author: { $in: wantMoreAuthorsAndTags.map(item => item.author) } },
      { tags: { $in: wantMoreAuthorsAndTags.flatMap(item => item.tags) } }
    ],
    _id: { $nin: [...wantLessPosts, ...wantMorePosts] }
  }).limit(10);
  return similarToWantMore;
}

export async function getUserFavoriteTags(userId: mongoose.Types.ObjectId): Promise<string[]> {
  await dbConnect();
  const user = await User.findById(userId).populate('bookmarks').populate('viewedPosts').exec();
  const allPosts = [...user.bookmarks, ...user.viewedPosts];
  const allTags = allPosts.flatMap(post => [...post.tags, post.mainTag]);

  const tagCounts: TagCount = allTags.reduce((acc: TagCount, tag: string) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {});

  const mostFrequentTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]).slice(0, 5);
  return mostFrequentTags;
}

export async function getRecommendationsFromSimilarUsers(userId: mongoose.Types.ObjectId): Promise<mongoose.Document[]> {
  await dbConnect();
  // Primeiro, encontre usuários semelhantes
  const similarUserIds = await findSimilarUsers(userId);
  // Depois, encontre os posts que usuários semelhantes viram, mas o usuário atual não
  const viewedPostsIds = await getPostsViewedByUser(userId);
  
  const recommendations = await Post.find({
    _id: { $nin: viewedPostsIds }, // Posts que o usuário atual não viu
    viewedBy: { $in: similarUserIds } // Vistos por usuários semelhantes
  }).limit(10);

  return recommendations;
}


async function findSimilarUsers(userId: mongoose.Types.ObjectId): Promise<mongoose.Types.ObjectId[]> {
  await dbConnect();
  // Obtém os posts visualizados e bookmarked pelo usuário
  const user = await User.findById(userId).exec();
  if (!user) {
    // O usuário não foi encontrado, então retorne um array vazio ou lance um erro
    return [];
  }

  // Busca por usuários que têm postagens em comum nos campos viewedPosts ou bookmarks
  const usersWithCommonPosts = await User.find({
    $or: [
      { viewedPosts: { $in: user.viewedPosts } },
      { bookmarks: { $in: user.bookmarks } },
    ],
    _id: { $ne: userId },
  }).exec();

  return usersWithCommonPosts.map(user => user._id);
}

async function getPostsViewedByUser(userId: mongoose.Types.ObjectId): Promise<mongoose.Types.ObjectId[]> {
  await dbConnect();
  const user = await User.findById(userId).exec();
  if (!user) {
    // O usuário não foi encontrado, então retorne um array vazio ou lance um erro
    return [];
  }

  // Retorna os IDs dos posts que o usuário visualizou
  return user.viewedPosts;
}

export async function getRecommendationsFromTags(userId: mongoose.Types.ObjectId): Promise<mongoose.Document[]> {
  await dbConnect();
  // Encontre as tags favoritas do usuário
  const favoriteTags = await getUserFavoriteTags(userId);
  // Encontre os posts que o usuário ainda não viu, mas que contêm suas tags favoritas
  const viewedPostsIds = await getPostsViewedByUser(userId);
  
  const tagRecommendations = await Post.find({
    _id: { $nin: viewedPostsIds },
    $or: [{ tags: { $in: favoriteTags } }, { mainTag: { $in: favoriteTags } }]
  }).limit(10);

  return tagRecommendations;
}

export async function createFeedback(data: IFeedback): Promise<IFeedback> {
  await dbConnect();
  const feedback = new Feedback(data);
  await feedback.save();
  return feedback;
}

export async function createPost(data: IPost): Promise<IPost> {
  await dbConnect();
  const post = new Post(data);
  await post.save();
  return post;
}

export async function createUser(data: IUser): Promise<IUser> {
  await dbConnect();
  const user = new User(data);
  await user.save();
  return user;
}

export async function createComment(data: IComment): Promise<IComment> {
  await dbConnect();
  const comment = new Comment(data);
  await comment.save();
  return comment;
}

export async function createProgress(data: IProgress): Promise<IProgress> {
  await dbConnect();
  const progress = new Progress(data);
  await progress.save();
  return progress;
}