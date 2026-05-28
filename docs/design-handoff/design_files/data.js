// data.js — sample authored topic(s) for the micro-learning hub.
// Each topic breaks into bite-sized "pills". Each pill is a focused, 1–3 min module.

window.TOPICS = {
  agents: {
    id: "agents",
    title: "Working with AI agents",
    blurb: "What an agent actually is, how the loop works, and how to make one you can trust.",
    emoji: "🤖",
    materials: [
      { type: "link", label: "Hermes internal docs" },
      { type: "pdf", label: "Agent design guide.pdf" },
      { type: "link", label: "Building effective agents (article)" }
    ],
    pills: [
      {
        id: "a1",
        title: "What is an agent?",
        minutes: 2,
        hook: "An agent is an LLM that can take actions — not just talk.",
        analogy: "A chatbot is a knowledgeable friend who can only give advice. An agent is an intern who can actually go do the task — open the tools, run the search, file the report.",
        points: [
          "Agent = a model + tools + a loop.",
          "It decides what to do next, step by step.",
          "It works toward a goal, not just one reply."
        ],
        check: {
          q: "What makes an agent different from a plain chatbot?",
          options: ["It can take actions / use tools", "It writes longer answers", "It runs offline"],
          answer: 0
        },
        takeaway: "An agent acts; a chatbot only talks."
      },
      {
        id: "a2",
        title: "The agent loop",
        minutes: 3,
        hook: "Agents run a simple cycle: think → act → observe, then repeat.",
        analogy: "Like a robot vacuum: sense the room, decide a move, move, then sense again. It keeps looping until the floor’s clean — or it gives up.",
        points: [
          "It plans a step, then calls a tool.",
          "It reads the result, then decides the next step.",
          "The loop ends when the goal is met or it stops."
        ],
        check: {
          q: "Right after an agent uses a tool, what does it do?",
          options: ["Stops immediately", "Observes the result and picks the next step", "Asks the user to restart"],
          answer: 1
        },
        takeaway: "Think, act, observe — on repeat."
      },
      {
        id: "a3",
        title: "Tools & function calling",
        minutes: 2,
        hook: "Tools are the agent’s hands — the things it’s allowed to actually do.",
        analogy: "You hand the intern a phone, a calculator, and the office keys. Each is a defined capability. The agent picks which one to use and how.",
        points: [
          "Each tool has a name, inputs, and a result.",
          "The model chooses the tool and fills the arguments.",
          "You decide which tools exist — that’s its power & limit."
        ],
        check: {
          q: "A “tool” lets the agent…",
          options: ["Think harder", "Do something in the world (search, call an API…)", "Talk faster"],
          answer: 1
        },
        takeaway: "Tools define what an agent can actually do."
      },
      {
        id: "a4",
        title: "Memory & context",
        minutes: 3,
        hook: "An agent only knows what’s currently in its context window.",
        analogy: "Picture a whiteboard that gets wiped when it’s full. Whatever you didn’t write down — or chose to erase — is simply gone. You manage what stays.",
        points: [
          "Short-term memory = the live context / conversation.",
          "Long-term memory = stored notes it can look up.",
          "Feed it the right context, not everything."
        ],
        check: {
          q: "Why does context matter so much?",
          options: ["It makes replies polite", "The agent forgets anything not in its context", "It speeds up tools"],
          answer: 1
        },
        takeaway: "If it’s not in context, the agent doesn’t know it."
      },
      {
        id: "a5",
        title: "Prompting & instructions",
        minutes: 2,
        hook: "The system prompt is the agent’s job description.",
        analogy: "It’s the onboarding doc for your intern: who you are, the rules, the tone, and crucially — when to ask versus just act.",
        points: [
          "Give it a clear role, constraints, and examples.",
          "Tell it when to act and when to check with a human.",
          "Most behavior problems trace back to this."
        ],
        check: {
          q: "The system prompt mainly defines…",
          options: ["The agent’s role, rules, and behavior", "The internet speed", "The user’s password"],
          answer: 0
        },
        takeaway: "Write the job description before blaming the intern."
      },
      {
        id: "a6",
        title: "Guardrails & evaluation",
        minutes: 3,
        hook: "Trust comes from limits plus testing — not hope.",
        analogy: "Training wheels and a report card. Limits stop the worst mistakes; evals tell you whether it’s actually getting the job done.",
        points: [
          "Limit risky actions; require approval for the big ones.",
          "Run evals on real tasks to measure quality.",
          "Iterate — first versions are rarely the last."
        ],
        check: {
          q: "Best way to know your agent actually works?",
          options: ["It sounds confident", "Evaluate it on real tasks", "It never errors out"],
          answer: 1
        },
        takeaway: "Limit the downside, measure the upside."
      }
    ]
  },

  stocks: {
    id: "stocks",
    title: "How the stock market works",
    blurb: "From “what even is a stock?” to buying your first share — in tiny pieces.",
    emoji: "📈",
    materials: [
      { type: "link", label: "Investopedia — market basics" },
      { type: "pdf", label: "Beginner investing guide.pdf" }
    ],
    pills: [
      {
        id: "p1",
        title: "What even is a stock?",
        minutes: 2,
        hook: "A stock is a tiny slice of ownership in a real company.",
        analogy: "Imagine your friend’s pizza shop sells 100 “slices of ownership.” Buy one, and you own 1% of the shop — including 1% of every future profit.",
        points: [
          "A share = a small piece of a company you can own.",
          "Own shares and you’re literally a part-owner, not a lender.",
          "Companies sell shares to raise money to grow."
        ],
        check: {
          q: "If a company splits into 100 shares and you buy 1, how much do you own?",
          options: ["1% of the company", "100% of the company", "Nothing until it’s sold"],
          answer: 0
        },
        takeaway: "Buying a stock = buying a slice of a company."
      },
      {
        id: "p2",
        title: "Why prices move",
        minutes: 3,
        hook: "Prices are just a live tug-of-war between buyers and sellers.",
        analogy: "Think of a concert ticket. One seat, lots of fans wanting it → price climbs. Nobody wants it → price drops. Stocks work the same way, every second.",
        points: [
          "More buyers than sellers → price goes up.",
          "More sellers than buyers → price goes down.",
          "News, profits, and mood all shift who wants in."
        ],
        check: {
          q: "Lots of people suddenly want to buy a stock. What usually happens?",
          options: ["Price falls", "Price rises", "Nothing changes"],
          answer: 1
        },
        takeaway: "Price = whatever buyers and sellers agree on right now."
      },
      {
        id: "p3",
        title: "Bulls, bears & market mood",
        minutes: 2,
        hook: "Two animals describe whether the market is hopeful or scared.",
        analogy: "A bull swings its horns up → prices rising, optimism. A bear swipes its paws down → prices falling, fear. The whole market has moods too.",
        points: [
          "Bull market = prices trending up, confidence high.",
          "Bear market = prices trending down, caution high.",
          "Moods can flip — they’re feelings, not facts."
        ],
        check: {
          q: "A “bull market” means…",
          options: ["Prices falling", "Prices rising", "The market is closed"],
          answer: 1
        },
        takeaway: "Bull = up & hopeful. Bear = down & fearful."
      },
      {
        id: "p4",
        title: "What’s an index?",
        minutes: 2,
        hook: "An index is a scoreboard for a whole group of companies.",
        analogy: "The S&P 500 is like a team scoreboard tracking 500 big U.S. companies at once. When you hear “the market is up,” it usually means an index like this rose.",
        points: [
          "An index bundles many stocks into one number.",
          "It shows the overall direction, not one company.",
          "Famous ones: S&P 500, Nasdaq, Dow Jones."
        ],
        check: {
          q: "The S&P 500 mostly tells you…",
          options: ["How one company did", "How ~500 companies did overall", "Tomorrow’s prices"],
          answer: 1
        },
        takeaway: "An index = the big-picture scoreboard."
      },
      {
        id: "p5",
        title: "Risk & not putting all your eggs in one basket",
        minutes: 3,
        hook: "Spreading money around softens the blow when one thing drops.",
        analogy: "Carry all your eggs in one basket and a single trip ruins breakfast. Spread them across baskets and one stumble barely matters. That’s diversification.",
        points: [
          "Any single stock can crash — that’s risk.",
          "Owning many things spreads the risk out.",
          "Index funds give instant diversification."
        ],
        check: {
          q: "Diversification mainly helps you…",
          options: ["Guarantee profit", "Reduce the damage of one bad pick", "Predict prices"],
          answer: 1
        },
        takeaway: "Don’t bet everything on one company."
      },
      {
        id: "p6",
        title: "How people actually buy",
        minutes: 2,
        hook: "You buy stocks through a broker — today, usually just an app.",
        analogy: "A broker is like a ticket booth between you and the market. Modern apps are that booth in your pocket — tap, buy a share, done.",
        points: [
          "A broker connects your order to the market.",
          "Most are now phone apps with no commission.",
          "You can often buy a fraction of one share."
        ],
        check: {
          q: "What sits between you and the stock market?",
          options: ["A broker / app", "The government", "Nothing — you call the company"],
          answer: 0
        },
        takeaway: "A broker app is your doorway to buying."
      },
      {
        id: "p7",
        title: "Long game vs. gambling",
        minutes: 2,
        hook: "Investing rewards patience; chasing quick wins is closer to betting.",
        analogy: "Planting a tree vs. spinning a roulette wheel. One slowly grows if you wait; the other is a thrill with bad odds. Time in the market beats timing it.",
        points: [
          "Markets tend to rise over many years.",
          "Frequent trading often loses to just waiting.",
          "Only invest money you won’t need soon."
        ],
        check: {
          q: "What historically works better for most people?",
          options: ["Trading daily for quick wins", "Investing steadily for the long run", "Waiting for the perfect day"],
          answer: 1
        },
        takeaway: "Patience is the quiet superpower."
      }
    ]
  },

  espresso: {
    id: "espresso",
    title: "The basics of espresso",
    blurb: "Pull a better shot by understanding the four things that actually matter.",
    emoji: "☕",
    materials: [
      { type: "link", label: "James Hoffmann — espresso 101" },
      { type: "note", label: "My machine’s manual" }
    ],
    pills: [
      {
        id: "e1",
        title: "What espresso actually is",
        minutes: 2,
        hook: "Espresso is coffee forced through fine grounds under pressure.",
        analogy: "It’s like a firehose vs. a watering can. Hot water under high pressure blasts through coffee in ~25 seconds, pulling out a concentrated shot.",
        points: [
          "~9 bars of pressure push water through.",
          "A shot pulls in roughly 25–30 seconds.",
          "Concentrated, not just ‘strong’ coffee."
        ],
        check: {
          q: "What makes espresso different from drip coffee?",
          options: ["Pressure forces the water through", "It uses cold water", "It steeps for hours"],
          answer: 0
        },
        takeaway: "Pressure + fine grounds = espresso."
      },
      {
        id: "e2",
        title: "The grind is everything",
        minutes: 2,
        hook: "Grind size controls how fast water flows — and how it tastes.",
        analogy: "Think sand vs. gravel. Too fine and water trickles (bitter). Too coarse and it gushes (sour). You’re dialing in the sweet spot.",
        points: [
          "Finer grind → slower flow → more extraction.",
          "Coarser grind → faster flow → less extraction.",
          "Adjust grind first when a shot tastes off."
        ],
        check: {
          q: "Your shot runs too fast and tastes sour. What do you change?",
          options: ["Grind finer", "Grind coarser", "Add more water"],
          answer: 0
        },
        takeaway: "Dial the grind before anything else."
      },
      {
        id: "e3",
        title: "Dose, yield & ratio",
        minutes: 3,
        hook: "Most good shots follow a simple in-to-out ratio.",
        analogy: "Like a recipe: a common starting point is 1:2 — 18g of coffee in, 36g of espresso out. Tweak from there to taste.",
        points: [
          "Dose = grams of coffee going in.",
          "Yield = grams of espresso coming out.",
          "1:2 is a reliable place to begin."
        ],
        check: {
          q: "A 1:2 ratio from an 18g dose means a yield of…",
          options: ["9g", "36g", "180g"],
          answer: 1
        },
        takeaway: "Start at 1:2, then adjust to taste."
      },
      {
        id: "e4",
        title: "Tasting & adjusting",
        minutes: 2,
        hook: "Two flavors tell you almost everything: sour vs. bitter.",
        analogy: "Sour = under-extracted (too little pulled out). Bitter = over-extracted (too much). You’re steering between the two toward sweet.",
        points: [
          "Sour & thin → extract more (finer / longer).",
          "Bitter & harsh → extract less (coarser / shorter).",
          "Change one variable at a time."
        ],
        check: {
          q: "A bitter, harsh shot is usually…",
          options: ["Under-extracted", "Over-extracted", "Too cold"],
          answer: 1
        },
        takeaway: "Sour = more, bitter = less. Aim for sweet."
      }
    ]
  }
};

// Projects = a topic the user is learning, plus delivery + research state.
// status: "researching" | "review" | "learning"
window.PROJECTS = [
  {
    id: "hermes",
    name: "Hermes agent",
    topicId: "agents",
    status: "review",
    cadence: "Each weekday morning",
    addedAgo: "Just now"
  },
  {
    id: "market",
    name: "Stock market crash course",
    topicId: "stocks",
    status: "learning",
    cadence: "Each morning",
    addedAgo: "3 days ago"
  }
];

// Bonus concepts pulled in when you add new materials to a project (fallback when AI is unavailable).
window.EXTRAS = {
  agents: [
    {
      id: "ax1", title: "When NOT to use an agent", minutes: 2,
      hook: "Sometimes a plain script or one prompt beats a whole thinking loop.",
      analogy: "You don’t hire a self-driving car to move a couch three feet. If the task never changes, a straight line beats a brain.",
      points: ["If the steps never change, just script it.", "Agents shine on fuzzy, multi-step goals.", "More autonomy = more ways to go wrong."],
      check: { q: "When is an agent probably overkill?", options: ["A fixed, predictable task", "A messy open-ended goal", "A task with many unknowns"], answer: 0 },
      takeaway: "Match the tool to the mess — not every job needs a brain."
    }
  ],
  stocks: [
    {
      id: "sx1", title: "Dividends — getting paid to hold", minutes: 2,
      hook: "Some companies pay you simply for owning their shares.",
      analogy: "Like owning a vending machine: even while you sleep, it drops a few coins your way every quarter.",
      points: ["A dividend is a slice of profit paid to owners.", "Not every company pays one.", "Reinvest them and they compound."],
      check: { q: "A dividend is…", options: ["A fee you pay", "A share of profit paid to you", "A kind of loan"], answer: 1 },
      takeaway: "Dividends pay you to be patient."
    }
  ],
  espresso: [
    {
      id: "ex1", title: "Milk & microfoam", minutes: 2,
      hook: "Great milk is tiny, paint-like bubbles — not big dry froth.",
      analogy: "Think wet paint, not a bubble bath. Microfoam is glossy and pourable; big bubbles are dish soap.",
      points: ["Add air early, then swirl to texture it.", "Aim for glossy, paint-like milk.", "Stop around 60–65°C."],
      check: { q: "Good microfoam looks like…", options: ["Stiff dry foam", "Glossy wet paint", "Plain hot milk"], answer: 1 },
      takeaway: "Wet paint, not bubble bath."
    }
  ]
};

