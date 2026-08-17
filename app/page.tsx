import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Services from '@/components/Services';
import HowItWorks from '@/components/HowItWorks';
import Pricing from '@/components/Pricing';
import WhyUs from '@/components/WhyUs';
import ContactForm from '@/components/ContactForm';
import Footer from '@/components/Footer';

export default function Page() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Services />
        <HowItWorks />
        <Pricing />
        <WhyUs />
        <ContactForm />
      </main>
      <Footer />
    </>
  );
}
