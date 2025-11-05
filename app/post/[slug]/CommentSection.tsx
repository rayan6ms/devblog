'use client';

import { useMemo, useState } from 'react';
import Comment from './Comment';
import LoginModal from './LoginModal';
import ReportCommentModal from './ReportCommentModal';

const user = 'me';
const userIsLoggedIn = false;
const userAvatar =
  'https://imagens.brasil.elpais.com/resizer/nCpDbZnTqbBMJsTdXM6xmN17xpg=/1960x0/arc-anglerfish-eu-central-1-prod-prisa.s3.amazonaws.com/public/6TIOUTQV4DCNJTPRHFBQQCYQGA.jpg';

const comments = [
  {
    id: 1,
    author: 'Johann Gottfried',
    date: '2023-11-20',
    commentText:
      'This is a really informative article. Thanks for sharing! Lorem ipsum dolor sit amet consectetur adipisicing elit. Ducimus atque aliquid quam nostrum reiciendis! Tempora ab magnam, non expedita minus ducimus pariatur itaque corrupti minima ipsam amet dignissimos natus veniam.',
    upvotes: 50,
    downvotes: 2,
    avatar:
      'https://imageio.forbes.com/specials-images/imageserve/5db83d5a38073500062a7fc0/-Joker-/0x0.jpg?format=jpg&crop=902,507,x370,y188,safe&width=960',
  },
  {
    id: 2,
    author: 'Sarah Connor',
    date: '2023-11-18',
    commentText:
      'I found this post really helpful. Looking forward to more content!',
    upvotes: 25,
    downvotes: 26,
    avatar:
      'https://revolucaonerd.com/wordpress/wp-content/files/revolucaonerd.com/2023/04/batman-animacao-1024x683.webp',
  },
];

export default function CommentSection() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<number | null>(null);
  const reportTarget = useMemo(
    () => comments.find((c) => c.id === reportTargetId) || undefined,
    [reportTargetId]
  );

  const [votes, setVotes] = useState<Record<number, number>>(() =>
    comments.reduce((acc, c) => {
      acc[c.id] = c.upvotes - c.downvotes;
      return acc;
    }, {} as Record<number, number>)
  );

  const [userVotes, setUserVotes] = useState<Record<number, 'up' | 'down' | null>>(
    () =>
      comments.reduce((acc, c) => {
        acc[c.id] = null;
        return acc;
      }, {} as Record<number, 'up' | 'down' | null>)
  );

  const handleComment = () => {
    if (!userIsLoggedIn) {
      setIsLoginOpen(true);
      return;
    }
    // TODO: add real submit when you have a backend
  };

  const handleVote = (id: number, action: 'up' | 'down') => {
    if (!userIsLoggedIn) {
      setIsLoginOpen(true);
      return;
    }
    const currentVote = userVotes[id] || null;
    let delta = 0;

    if (currentVote === action) {
      delta = action === 'up' ? -1 : 1;
      setUserVotes((prev) => ({ ...prev, [id]: null }));
    } else if (currentVote === null) {
      delta = action === 'up' ? 1 : -1;
      setUserVotes((prev) => ({ ...prev, [id]: action }));
    } else {
      delta = action === 'up' ? 2 : -2;
      setUserVotes((prev) => ({ ...prev, [id]: action }));
    }

    setVotes((prev) => ({ ...prev, [id]: prev[id] + delta }));
  };

  const handleFlag = (id: number) => {
    if (!userIsLoggedIn) {
      setIsLoginOpen(true);
      return;
    }
    setReportTargetId(id);
    setIsReportOpen(true);
  };

  const handleSubmitReport = (payload: {
    commentId: number;
    reason: string;
    details?: string;
    dateISO: string;
  }) => {
    const key = 'reportedCommentIds';
    const keyData = localStorage.getItem(key);
    const reportedSet = new Set<number>(keyData ? JSON.parse(keyData) : []);
    if (reportedSet.has(payload.commentId)) return;
  
    const reportsKey = 'commentReports';
    const existing = localStorage.getItem(reportsKey);
    const list = existing ? (JSON.parse(existing) as any[]) : [];
    list.push(payload);
    localStorage.setItem(reportsKey, JSON.stringify(list));
  
    reportedSet.add(payload.commentId);
    localStorage.setItem(key, JSON.stringify(Array.from(reportedSet)));
  };

  return (
    <section className="mt-10">
      <h1 className="text-xl font-bold">Comment Section</h1>

      <div className="flex mt-5 mb-12">
        <img
          className="w-12 h-12 object-cover rounded-full mr-4"
          src={userAvatar}
          alt={`Avatar de ${user}`}
          title={`Avatar de ${user}`}
        />
        <div className="flex flex-col w-full h-full bg-greyBg/90 border border-zinc-700/50 shadow-md shadow-zinc-900 rounded-lg">
          <textarea
            className="p-5 rounded-t-lg bg-greyBg/90 border-b border-zinc-700/50 text-zinc-400"
            name="Comment input area"
            cols={5}
            rows={2}
            placeholder="Adicione um comentário"
            onClick={() => {
              if (!userIsLoggedIn) setIsLoginOpen(true);
            }}
          />
          <div className="flex justify-end p-1">
            <button
              onClick={handleComment}
              className="bg-purpleContrast/80 hover:bg-purpleContrast rounded-lg p-1 px-1.5 mr-0.5 text-sm text-gray-200"
            >
              Comentar
            </button>
          </div>
        </div>
      </div>

      {comments.map((comment) => (
        <Comment
          key={comment.id}
          {...comment}
          votes={votes}
          userVotes={userVotes}
          onVote={handleVote}
          onFlag={handleFlag}
        />
      ))}

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      <ReportCommentModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        comment={
          reportTarget
            ? { id: reportTarget.id, author: reportTarget.author, text: reportTarget.commentText }
            : undefined
        }
        onSubmit={handleSubmitReport}
      />
    </section>
  );
}
