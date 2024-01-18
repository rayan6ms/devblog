'use client'


import { useState } from 'react';
import Comment from './Comment';
import LoginModal from './LoginModal';

const user = 'me';
const userIsLoggedIn = false;
const userAvatar = "https://imagens.brasil.elpais.com/resizer/nCpDbZnTqbBMJsTdXM6xmN17xpg=/1960x0/arc-anglerfish-eu-central-1-prod-prisa.s3.amazonaws.com/public/6TIOUTQV4DCNJTPRHFBQQCYQGA.jpg"

const comments = [
  {
    id: 1,
    author: "Johann Gottfried",
    date: "2023-11-20",
    commentText: "This is a really informative article. Thanks for sharing! Lorem ipsum dolor sit amet consectetur adipisicing elit. Ducimus atque aliquid quam nostrum reiciendis! Tempora ab magnam, non expedita minus ducimus pariatur itaque corrupti minima ipsam amet dignissimos natus veniam.",
    upvotes: 50,
    downvotes: 2,
    avatar: "https://imageio.forbes.com/specials-images/imageserve/5db83d5a38073500062a7fc0/-Joker-/0x0.jpg?format=jpg&crop=902,507,x370,y188,safe&width=960"
  },
  {
    id: 2,
    author: "Sarah Connor",
    date: "2023-11-18",
    commentText: "I found this post really helpful. Looking forward to more content!",
    upvotes: 25,
    downvotes: 26,
    avatar: "https://revolucaonerd.com/wordpress/wp-content/files/revolucaonerd.com/2023/04/batman-animacao-1024x683.webp"
  },
];

export default function CommentSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [votes, setVotes] = useState<Record<number, number>>(
    comments.reduce((acc: Record<number, number>, comment) => {
      acc[comment.id] = comment.upvotes - comment.downvotes;
      return acc;
    }, {})
  );

  const [userVotes, setUserVotes] = useState<Record<number, 'up' | 'down' | null>>(
    comments.reduce((acc: Record<number, 'up' | 'down' | null>, comment) => {
      acc[comment.id] = null;
      return acc;
    }, {})
  );

  const handleComment = () => {
    if (!userIsLoggedIn) {
      setIsModalOpen(true);
    }
  };

  const handleVote = (id: number, action: 'up' | 'down') => {
    const currentVote = userVotes[id] || null;
    let voteDifference = 0;

    if (currentVote === action) {
        voteDifference = action === 'up' ? -1 : 1;
        setUserVotes(prevUserVotes => ({ ...prevUserVotes, [id]: null }));
    } else if (currentVote === null) {
        voteDifference = action === 'up' ? 1 : -1;
        setUserVotes(prevUserVotes => ({ ...prevUserVotes, [id]: action }));
    } else {
        voteDifference = action === 'up' ? 2 : -2;
        setUserVotes(prevUserVotes => ({ ...prevUserVotes, [id]: action }));
    }

    setVotes(prevVotes => ({ ...prevVotes, [id]: prevVotes[id] + voteDifference }));
  }

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
            id=""
            cols={5}
            rows={2}
            placeholder="Adicione um comentário"
            onClick={() => {if (!userIsLoggedIn) setIsModalOpen(true)}}
          />
          <div className="flex justify-end p-1">
            <button
              onClick={handleComment}
              className="bg-purpleContrast/80 hover:bg-purpleContrast rounded-lg p-1 px-1.5 mr-0.5 text-sm text-gray-200">
              Comentar
            </button>
            <LoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
          </div>
        </div>
      </div>
      {comments.map(comment => (
        <Comment
          key={comment.id}
          {...comment}
          votes={votes}
          userVotes={userVotes}
          onVote={handleVote}
        />
      ))}
    </section>
  )
}
