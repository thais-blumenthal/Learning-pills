
const res = await fetch("https://slack.com/api/chat.postMessage", {

  method: "POST",

  headers: {

    Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,

    "Content-Type": "application/json",

  },

  body: JSON.stringify({

    channel: "U081T2SA4TT", // <-- replace with YOUR member ID

    text: "hello from my learning bot 🎉",

  }),

});

const data = await res.json();

console.log(data);

