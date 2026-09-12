import Footer from "@/components/Footer";
import PageIntro from "@/components/PageIntro";
import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/request-locale";
export default async function AboutPage() {
	const messages = getMessages(await getRequestLocale());
	return (
		<>
			<main className="site-container page-content">
				<PageIntro
					title={messages.about.title}
					description={messages.about.description}
				/>
				{messages.about.storyCards.map((card) => (
					<section key={card.title} className="story-section">
						<h2 className="section-title">{card.title}</h2>
						<p>{card.text}</p>
					</section>
				))}
			</main>
			<Footer />
		</>
	);
}
