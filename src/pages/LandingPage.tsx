import { useState, useEffect, useRef } from 'react';
import {
  Heart,
  Stethoscope,
  Calendar,
  Package,
  BarChart3,
  Users,
  Menu,
  X,
  Clock,
  CheckCircle,
  Shield,
  FileText,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Bone,
  Scissors,
  FlaskConical,
  Home,
  Syringe,
  Hospital
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<string>('');
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const aboutRef = useRef<HTMLElement>(null);
  const servicesRef = useRef<HTMLElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const faqRef = useRef<HTMLElement>(null);

  // Smooth scroll handler with offset for sticky header
  const handleScrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 80; // approximate sticky header height
      const elementTop = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementTop - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });

      setIsMobileMenuOpen(false);
    }
  };

  // Scroll detection to highlight active section
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100; // Offset for better detection

      const sections = [
        { id: 'about', ref: aboutRef },
        { id: 'services', ref: servicesRef },
        { id: 'features', ref: featuresRef },
        { id: 'faq', ref: faqRef },
      ];

      // Find which section is currently in view
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section.ref.current) {
          const rect = section.ref.current.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom >= 150) {
            if (activeSection !== section.id) {
              setActiveSection(section.id);
            }
            return;
          }
        }
      }

      // If scrolled to top, clear active section
      if (window.scrollY < 100) {
        if (activeSection !== '') {
          setActiveSection('');
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // FAQ data
  const faqs = [
    {
      question: "How do I book an appointment?",
      answer: "Simply click 'Sign Up' to create an account, then navigate to 'Book Appointment'. Choose your preferred service, select an available date and time, choose a veterinarian, and complete the booking. You can pay a deposit online or choose to pay at the clinic."
    },
    {
      question: "Can I view my pet's medical history?",
      answer: "Yes! Once you're logged in, you can access your pet's complete medical history including vaccinations, treatments, allergies, and past appointments through the 'Pet Records' section."
    },
    {
      question: "What payment methods are accepted?",
      answer: "We accept online payments through our secure payment gateway. For appointments, you can pay a 30% deposit online and the remaining balance at the clinic, or pay in full at the clinic. All payments are processed securely."
    },
    {
      question: "Can I cancel or reschedule an appointment?",
      answer: "Yes, you can manage your appointments through the 'My Appointments' section. You can view pending, confirmed, and past appointments, and contact the clinic to reschedule if needed."
    },
    {
      question: "How do I track my pet's vaccinations?",
      answer: "All vaccination records are stored in your pet's medical history. You can view upcoming vaccinations, past vaccinations, and set reminders for future doses in the 'Pet Records' section."
    },
    {
      question: "Is my information secure?",
      answer: "Absolutely! We use enterprise-grade security measures to protect all personal and medical information. Your data is encrypted and stored securely, and we comply with all healthcare data protection regulations."
    }
  ];

  const testimonials = [
    {
      name: 'Lori Holland',
      role: 'Dog Mom of 2',
      quote:
        "Booking vet visits used to be so stressful. With FurSure I can schedule everything from my couch and get reminders before every appointment.",
      rating: 5,
      avatar:
        'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    {
      name: 'Katy Harper',
      role: 'First-time Puppy Parent',
      quote:
        "The pet records dashboard is a game changer. I never lose track of vaccines or prescriptions anymore.",
      rating: 5,
      avatar:
        'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    {
      name: 'Sandra Hoosier',
      role: 'Clinic Manager',
      quote:
        'Managing schedules and inventory has never been this easy. Our team finally spends more time with pets and less time on paperwork.',
      rating: 4,
      avatar:
        'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=400'
    }
  ];

  const products = [
    {
      name: 'Tango Treats',
      description: 'Grain-free bites for healthy training rewards.',
      badge: 'Best Seller',
      image:
        'https://images.pexels.com/photos/140014/pexels-photo-140014.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    {
      name: 'Daily Wellness Bites',
      description: 'Vitamins & supplements for shiny coats and strong joints.',
      badge: 'New',
      image:
        'https://images.pexels.com/photos/4110473/pexels-photo-4110473.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    {
      name: 'Gourmet Kibble Mix',
      description: 'Balanced nutrition for active cats & dogs.',
      badge: '15% Off',
      image:
        'https://images.pexels.com/photos/5731865/pexels-photo-5731865.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    {
      name: 'Calming Chews',
      description: 'Perfect for vet visits, grooming, and travel days.',
      badge: 'Vet Recommended',
      image:
        'https://images.pexels.com/photos/5731911/pexels-photo-5731911.jpeg?auto=compress&cs=tinysrgb&w=400'
    }
  ];

  // Auto-rotate testimonials
  useEffect(() => {
    const id = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 7000);

    return () => clearInterval(id);
  }, [testimonials.length]);

  const clinicServices = [
    {
      name: 'Pet Foods and Accessories',
      description: 'Premium nutrition and everyday essentials tailored to your pet’s needs.',
      icon: Package,
      imageUrl: 'https://cdn-icons-png.flaticon.com/128/3737/3737711.png'
    },
    {
      name: 'Grooming',
      description: 'Bathing, nail trimming, and coat care so your pets look and feel their best.',
      icon: Scissors,
      imageUrl: 'https://cdn-icons-png.flaticon.com/128/12452/12452259.png'
    },
    {
      name: 'Laboratory',
      description: 'On-site diagnostics for faster, more accurate health assessments.',
      icon: FlaskConical,
      imageUrl: 'https://cdn-icons-png.flaticon.com/128/18650/18650354.png'
    },
    {
      name: 'Boarding',
      description: 'Safe, comfortable stays for your pets while you are away.',
      icon: Home,
      imageUrl: 'https://cdn-icons-png.flaticon.com/128/3636/3636365.png'
    },
    {
      name: 'Consultation, Treatment, and Confinement',
      description: 'Complete medical care from check-up to recovery.',
      icon: Stethoscope,
      imageUrl: 'https://cdn-icons-png.flaticon.com/128/12639/12639544.png'
    },
    {
      name: 'Surgery',
      description: 'Modern surgical facilities with dedicated post-operative care.',
      icon: Hospital,
      imageUrl: 'https://cdn-icons-png.flaticon.com/128/3737/3737675.png'
    },
    {
      name: 'Vaccination and Deworming',
      description: 'Preventive care plans to keep your pets protected year-round.',
      icon: Syringe,
      imageUrl: 'https://cdn-icons-png.flaticon.com/128/2372/2372856.png'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header/Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 h-20 min-w-0">
            {/* Logo */}
            <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-[#A47148] rounded-full blur-sm opacity-30"></div>
                <div className="relative rounded-full p-2 bg-[#8B5A36] ring-2 ring-[#A47148] ring-offset-2 ring-offset-white">
                  <img 
                    src="/jocari-logo.jpg"
                    alt="Jocari Logo"
                    className="h-12 w-12 object-contain"
                  />
                </div>
              </div>
              <span className="text-base sm:text-xl lg:text-2xl font-bold text-slate-800 truncate">
                Jocari Pet Clinic and Grooming Salon
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6 xl:gap-8 shrink-0">
              <button 
                onClick={() => handleScrollTo('about')} 
                className={`relative font-medium transition-all duration-300 ease-in-out pb-1 ${
                  activeSection === 'about'
                    ? 'text-purple-600'
                    : 'text-gray-700 hover:text-purple-600'
                }`}
              >
                Who We Are
                <span 
                  className={`absolute bottom-0 left-0 h-0.5 bg-purple-600 transition-all duration-300 ease-in-out ${
                    activeSection === 'about' ? 'w-full opacity-100' : 'w-0 opacity-0'
                  }`}
                ></span>
              </button>
              <button 
                onClick={() => handleScrollTo('services')} 
                className={`relative font-medium transition-all duration-300 ease-in-out pb-1 ${
                  activeSection === 'services'
                    ? 'text-purple-600'
                    : 'text-gray-700 hover:text-purple-600'
                }`}
              >
                Our Services
                <span 
                  className={`absolute bottom-0 left-0 h-0.5 bg-purple-600 transition-all duration-300 ease-in-out ${
                    activeSection === 'services' ? 'w-full opacity-100' : 'w-0 opacity-0'
                  }`}
                ></span>
              </button>
              <button 
                onClick={() => handleScrollTo('features')} 
                className={`relative font-medium transition-all duration-300 ease-in-out pb-1 ${
                  activeSection === 'features'
                    ? 'text-purple-600'
                    : 'text-gray-700 hover:text-purple-600'
                }`}
              >
                Features
                <span 
                  className={`absolute bottom-0 left-0 h-0.5 bg-purple-600 transition-all duration-300 ease-in-out ${
                    activeSection === 'features' ? 'w-full opacity-100' : 'w-0 opacity-0'
                  }`}
                ></span>
              </button>
              <button 
                onClick={() => handleScrollTo('faq')} 
                className={`relative font-medium transition-all duration-300 ease-in-out pb-1 ${
                  activeSection === 'faq'
                    ? 'text-purple-600'
                    : 'text-gray-700 hover:text-purple-600'
                }`}
              >
                FAQs
                <span 
                  className={`absolute bottom-0 left-0 h-0.5 bg-purple-600 transition-all duration-300 ease-in-out ${
                    activeSection === 'faq' ? 'w-full opacity-100' : 'w-0 opacity-0'
                  }`}
                ></span>
              </button>
            </nav>

            {/* Login and Sign Up Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Link
                to="/login"
                className="px-3 sm:px-4 py-2 text-purple-600 hover:text-purple-700 font-semibold transition-colors whitespace-nowrap"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg font-semibold text-white shadow-sm hover:shadow-md transition-colors bg-[#5C4033] hover:bg-[#4A3328]"
              >
                Sign Up
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden shrink-0 text-gray-700 hover:text-purple-600"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-4 px-4 space-y-3">
            <button 
              onClick={() => handleScrollTo('about')} 
              className={`block py-2 w-full text-left transition-all duration-300 ease-in-out ${
                activeSection === 'about'
                  ? 'text-purple-600 font-semibold'
                  : 'text-gray-700 hover:text-purple-600'
              }`}
            >
              Who We Are
            </button>
            <button 
              onClick={() => handleScrollTo('services')} 
              className={`block py-2 w-full text-left transition-all duration-300 ease-in-out ${
                activeSection === 'services'
                  ? 'text-purple-600 font-semibold'
                  : 'text-gray-700 hover:text-purple-600'
              }`}
            >
              Our Services
            </button>
            <button 
              onClick={() => handleScrollTo('features')} 
              className={`block py-2 w-full text-left transition-all duration-300 ease-in-out ${
                activeSection === 'features'
                  ? 'text-purple-600 font-semibold'
                  : 'text-gray-700 hover:text-purple-600'
              }`}
            >
              Features
            </button>
            <button 
              onClick={() => handleScrollTo('faq')} 
              className={`block py-2 w-full text-left transition-all duration-300 ease-in-out ${
                activeSection === 'faq'
                  ? 'text-purple-600 font-semibold'
                  : 'text-gray-700 hover:text-purple-600'
              }`}
            >
              FAQs
            </button>
            <div className="pt-2 border-t border-gray-200 flex flex-col gap-2">
              <Link
                to="/login"
                className="block text-purple-600 hover:text-purple-700 py-2 font-semibold"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="block text-center rounded-lg py-2 px-4 font-semibold text-white bg-[#5C4033] hover:bg-[#4A3328] transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden hero-bg pb-36">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-200 rounded-full blur-3xl opacity-60 animate-float-slow"></div>
          <div className="absolute -bottom-32 -left-10 w-80 h-80 bg-indigo-200 rounded-full blur-3xl opacity-50 animate-float-slower"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Left: Text Content */}
            <div className="space-y-8">
  <h1 className="text-5xl lg:text-6xl font-serif font-bold text-[#3B1A0A] leading-tight">
    We take{' '}
    <span className="text-[#7C3A10] font-bold">
      care of your pets
    </span>
  </h1>
              
              <div className="relative">
  <div className="relative rounded-3xl p-6 shadow-2xl overflow-hidden border-4 border-[#A47148] bg-[#F4E4D4]">
    {/* Floating accents */}
    <div className="absolute -top-6 -left-6 w-32 h-32 bg-amber-300/30 rounded-full blur-2xl"></div>
    <div className="absolute -bottom-10 right-[-40px] w-40 h-40 bg-orange-200/30 rounded-full blur-3xl"></div>

    {/* Text content */}
    <div className="relative space-y-4 text-lg leading-relaxed">
      <p className="text-[#4A2210]">
        Before you bring your pet to the clinic, we make sure you're fully prepared. From quick bookings to real-time updates,
        we help you give your pets the care they deserve—without the stress.
      </p>
      <p className="text-[#4A2210]">
        With <strong className="text-[#7C3A10] font-semibold">Jocari Pet Clinic and Grooming Salon</strong>, you can manage appointments, health records, and payments all in one modern,
        easy-to-use platform—so you can focus on making memories, not managing schedules.
      </p>
    </div>
  </div>
</div>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white shadow-lg hover:shadow-xl transition-colors bg-[#5C4033] hover:bg-[#4A3328]"
                >
                  Book a Visit
                  <span className="text-xl leading-none" aria-hidden>↗</span>
                </Link>
                <button
                  onClick={() => handleScrollTo('services')}
                  className="px-6 py-3 border-2 border-[#9A7B4D] text-[#3B1A0A] rounded-full font-semibold hover:border-purple-400 hover:bg-purple-50/20 transition-colors"
                >
                  Browse Services
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-purple-100">
                <div>
                  <div className="text-3xl font-bold text-white">24/7</div>
                  <div className="text-sm text-white font-semibold">Care &amp; Support</div>
                </div>
                <div>
                 <div className="text-3xl font-bold text-white">4.9★</div>
                 <div className="text-sm text-white">Client Rating</div>
               </div>
               <div>
                 <div className="text-3xl font-bold text-white">+2K</div>
                 <div className="text-sm text-white">Happy Pets</div>
               </div>
              </div>
            </div>

            {/* Right: Visual Content */}
            <div className="relative">
              <div className="relative rounded-3xl p-0 shadow-2xl overflow-hidden border-4 border-[#A47148] bg-[#F4E4D4]">
                {/* Floating accents */}
                <div className="absolute -top-6 -left-6 w-32 h-32 bg-purple-300/40 rounded-full blur-2xl"></div>
                <div className="absolute -bottom-10 right-[-40px] w-40 h-40 bg-indigo-300/40 rounded-full blur-3xl"></div>

                {/* Single full-size image */}
                <img
                  src="https://img.freepik.com/free-photo/positive-afro-girl-yellow-jumper-holds-small-puppy-with-black-ear-plays-with-cute-pet-feels-energized-pleased_273609-31198.jpg?semt=ais_hybrid&w=740&q=80"
                  alt="Girl with puppy"
                  className="w-full h-auto object-cover block"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who We Are Section */}
      <section
        id="about"
        ref={aboutRef}
        className="bg-[#F4E4D4] py-14"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-slate-800 mb-4">Who We Are</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Jocari Pet Clinic and Grooming Salon is committed to providing quality veterinary care and grooming services for pets. To support their mission, the FurSure system was developed to help streamline clinic operations and make it easier for pet owners to schedule appointments, access pet records, and stay updated with their pet’s care.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-800">Our Mission</h3>
                <p className="text-gray-700 leading-relaxed">
                  At Jocari Pet Clinic and Grooming Salon, we believe that caring for your pet should be simple, stress-free, and accessible. 
                  We've created a comprehensive platform that allows pet owners to manage their pet's healthcare 
                  journey with ease, while providing veterinary clinics with powerful tools to streamline operations.
                </p>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-slate-800">What We Offer</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Online appointment booking system with real-time availability</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Complete pet medical records and history tracking</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Secure payment processing with flexible options</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Comprehensive clinic management tools for staff</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-purple-100 rounded-xl">
                      <Heart className="h-8 w-8 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Pet-Owner Centric</h4>
                      <p className="text-sm text-gray-600">Designed with your convenience in mind</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-blue-100 rounded-xl">
                      <Stethoscope className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Clinic-Friendly</h4>
                      <p className="text-sm text-gray-600">Streamlined operations for veterinary staff</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-100 rounded-xl">
                      <Shield className="h-8 w-8 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Secure & Reliable</h4>
                      <p className="text-sm text-gray-600">Your data is protected with enterprise-grade security</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" ref={servicesRef} className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-slate-800 mb-4">Our Services</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything your pet needs, from everyday care to advanced medical treatment.
            </p>
          </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {clinicServices.map((service, index) => {
              const Icon = service.icon;
              const hasCustomImage = 'imageUrl' in service && !!service.imageUrl;
              const isLast = index === clinicServices.length - 1;

              return (
                <div
                  key={service.name}
                  className={`group relative rounded-2xl border bg-white border-purple-50 transition-colors duration-300 p-6 shadow-sm cursor-pointer hover:bg-[#5C4033] hover:border-[#5C4033] hover:shadow-xl ${
                    isLast ? 'lg:col-start-2' : ''
                  }`}
                >
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl shadow-sm bg-purple-50 text-purple-600 group-hover:bg-white/20 group-hover:text-white overflow-hidden transition-colors duration-300">
                      {hasCustomImage ? (
                        <img
                          src={service.imageUrl as string}
                          alt={service.name}
                          className="service-icon h-8 w-8 object-contain transition-transform duration-300 group-hover:scale-110 group-hover:brightness-0 group-hover:invert"
                        />
                      ) : (
                        <Icon className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-purple-700 group-hover:text-white">
                        {service.name}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600 group-hover:text-[#F4E4D4]">
                        {service.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pet Owner vs Clinic Staff Services */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Pet Owner Services */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Heart className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">For Pet Owners</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Book & manage appointments effortlessly</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">View complete pet medical history</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Track vaccinations and treatments</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Secure payment processing</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Access appointment history anytime</span>
                </li>
              </ul>
            </div>

            {/* Clinic Staff Services */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">For Clinic Staff</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Complete appointment management system</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Inventory & stock control</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Analytics & revenue tracking</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Patient records management</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Schedule management for staff</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" ref={featuresRef} className="bg-gray-50 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-slate-800 mb-4">Why Choose Jocari Pet Clinic and Grooming Salon?</h2>
            <p className="text-xl text-gray-600">Modern, efficient, and user-friendly veterinary management</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 rounded-xl bg-white hover:shadow-lg transition-all">
              <div className="inline-flex p-4 bg-purple-100 rounded-full mb-4">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Smart Scheduling</h3>
              <p className="text-gray-600">Real-time availability and automated notifications for seamless appointment booking.</p>
            </div>

            <div className="text-center p-6 rounded-xl bg-white hover:shadow-lg transition-all">
              <div className="inline-flex p-4 bg-blue-100 rounded-full mb-4">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Secure & Private</h3>
              <p className="text-gray-600">Your pet's medical data is protected with enterprise-grade security measures.</p>
            </div>

            <div className="text-center p-6 rounded-xl bg-white hover:shadow-lg transition-all">
              <div className="inline-flex p-4 bg-indigo-100 rounded-full mb-4">
                <BarChart3 className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Advanced Analytics</h3>
              <p className="text-gray-600">Comprehensive insights to optimize clinic operations and improve pet care.</p>
            </div>

            <div className="text-center p-6 rounded-xl bg-white hover:shadow-lg transition-all">
              <div className="inline-flex p-4 bg-green-100 rounded-full mb-4">
                <Clock className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">24/7 Access</h3>
              <p className="text-gray-600">Manage appointments, view records, and access services anytime, anywhere.</p>
            </div>

            <div className="text-center p-6 rounded-xl bg-white hover:shadow-lg transition-all">
              <div className="inline-flex p-4 bg-yellow-100 rounded-full mb-4">
                <FileText className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Complete Records</h3>
              <p className="text-gray-600">Digital pet medical records with vaccination history, treatments, and more.</p>
            </div>

            <div className="text-center p-6 rounded-xl bg-white hover:shadow-lg transition-all">
              <div className="inline-flex p-4 bg-pink-100 rounded-full mb-4">
                <Package className="h-8 w-8 text-pink-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Inventory Management</h3>
              <p className="text-gray-600">Efficient stock tracking and inventory control for clinic operations.</p>
            </div>

            <div className="text-center p-6 rounded-xl bg-white hover:shadow-lg transition-all">
              <div className="inline-flex p-4 bg-teal-100 rounded-full mb-4">
                <UserCheck className="h-8 w-8 text-teal-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Staff Management</h3>
              <p className="text-gray-600">Comprehensive tools for managing veterinarians, schedules, and staff.</p>
            </div>

            <div className="text-center p-6 rounded-xl bg-white hover:shadow-lg transition-all">
              <div className="inline-flex p-4 bg-red-100 rounded-full mb-4">
                <Heart className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">User-Friendly</h3>
              <p className="text-gray-600">Intuitive interface designed for ease of use by both pet owners and staff.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pet Nutrition / Shop Section */}
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-4">
            <p className="text-sm uppercase tracking-[0.3em] text-purple-500">Pets Nutrition</p>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-slate-800">
              Shop &amp; save up to <span className="text-purple-600">15% off</span> top pet food.
            </h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Curated by veterinarians, loved by pets. High-quality treats, supplements, and essentials delivered to your clinic.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {products.map((product) => (
              <div
                key={product.name}
                className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all overflow-hidden border border-gray-100 flex flex-col"
              >
                <div className="relative">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute top-3 left-3 text-xs font-semibold px-3 py-1 rounded-full bg-white/90 text-purple-600 shadow-sm">
                    {product.badge}
                  </span>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-slate-800 mb-1">{product.name}</h3>
                  <p className="text-sm text-gray-600 flex-1">{product.description}</p>
                  <button className="mt-4 inline-flex items-center justify-between text-sm font-semibold text-purple-600">
                    View details
                    <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Reviews Section */}
      <section className="bg-gray-50 py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-sm uppercase tracking-[0.3em] text-purple-500">Happy Clients</p>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-slate-800">Loved by Pet Parents &amp; Clinics</h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Real stories from people who trust Jocari Pet Clinic and Grooming Salon to keep their pets healthy and clinics running smoothly.
            </p>
          </div>

          <div className="relative">
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <div
                  key={testimonial.name}
                  className={`transition-all duration-500 rounded-2xl border bg-white p-6 shadow-sm flex-col flex ${
                    index === activeTestimonial
                      ? 'scale-100 border-purple-200 shadow-xl'
                      : 'scale-95 opacity-70 hover:scale-100 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      <img src={testimonial.avatar} alt={testimonial.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{testimonial.name}</p>
                      <p className="text-xs text-gray-500">{testimonial.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <span key={i} className="text-amber-400 text-sm">
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed flex-1">“{testimonial.quote}”</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-center gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${
                    index === activeTestimonial ? 'bg-purple-600 w-6' : 'bg-purple-200 hover:bg-purple-400'
                  }`}
                  aria-label={`Show testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section id="faq" ref={faqRef} className="py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-slate-800 mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600">Everything you need to know about Jocari Pet Clinic and Grooming Salon</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 pr-8">{faq.question}</span>
                  {openFaq === index ? (
                    <ChevronUp className="h-5 w-5 text-purple-600 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-5">
                    <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#5C4033] py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-[#F4E4D4] mb-8">
            Join FurSure today and experience the future of veterinary care management
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/signup"
              className="px-8 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
            >
              Create Account
            </Link>
            <Link
              to="/login"
              className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <div className="rounded-full p-2 bg-[#8B5A36] ring-2 ring-[#C89F7A] ring-offset-2 ring-offset-slate-800">
                <img 
                  src="/jocari-logo.jpg"
                  alt="Jocari Logo"
                  className="h-10 w-10 object-contain"
                />
              </div>
              <span className="text-xl font-bold">Jocari Pet Clinic and Grooming Salon</span>
            </div>
            <nav
              className="flex flex-wrap items-center justify-center md:justify-end gap-x-8 gap-y-2 text-sm"
              aria-label="Legal"
            >
              <Link
                to="/terms"
                className="text-gray-300 hover:text-white transition-colors underline-offset-4 hover:underline"
              >
                Terms &amp; Conditions
              </Link>
              <Link
                to="/privacy"
                className="text-gray-300 hover:text-white transition-colors underline-offset-4 hover:underline"
              >
                Privacy Policy
              </Link>
            </nav>
          </div>
          <p className="text-gray-400 text-sm text-center md:text-left mt-8 pt-8 border-t border-slate-700">
            &copy; 2026  Jocari Pet Clinic and Grooming Salon · Powered by FurSure. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
