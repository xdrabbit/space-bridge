const Alexa = require('ask-sdk-core');
const audioData = require('./audioData');

// ── Launch: just start playing ──────────────────────────────────────────────
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    const track = audioData[0];
    return handlerInput.responseBuilder
      .speak(`Starting ${track.title}. Say stop to end, or next for a different sound.`)
      .addAudioPlayerPlayDirective('REPLACE_ALL', track.url, 'track-0', 0)
      .getResponse();
  }
};

// ── Play intent ─────────────────────────────────────────────────────────────
const PlayIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayIntent'
    );
  },
  handle(handlerInput) {
    // Check if user said a specific sound name
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const soundName = slots && slots.SoundName && slots.SoundName.value;

    let trackIndex = 0;
    if (soundName) {
      const found = audioData.findIndex(t =>
        t.title.toLowerCase().includes(soundName.toLowerCase())
      );
      if (found >= 0) trackIndex = found;
    }

    const track = audioData[trackIndex];
    const token = `track-${trackIndex}`;

    return handlerInput.responseBuilder
      .speak(`Playing ${track.title}.`)
      .addAudioPlayerPlayDirective('REPLACE_ALL', track.url, token, 0)
      .getResponse();
  }
};

// ── Next track ───────────────────────────────────────────────────────────────
const NextIntentHandler = {
  canHandle(handlerInput) {
    return (
      (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NextIntent') ||
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'PlaybackController.NextCommandIssued'
    );
  },
  handle(handlerInput) {
    // Get current token to figure out current track
    const token = handlerInput.requestEnvelope.context.AudioPlayer
      ? handlerInput.requestEnvelope.context.AudioPlayer.token
      : 'track-0';
    const currentIndex = parseInt((token || 'track-0').split('-')[1]) || 0;
    const nextIndex = (currentIndex + 1) % audioData.length;
    const track = audioData[nextIndex];

    return handlerInput.responseBuilder
      .addAudioPlayerPlayDirective('REPLACE_ALL', track.url, `track-${nextIndex}`, 0)
      .getResponse();
  }
};

// ── Stop / Cancel ────────────────────────────────────────────────────────────
const StopIntentHandler = {
  canHandle(handlerInput) {
    const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
    const intentName = requestType === 'IntentRequest'
      ? Alexa.getIntentName(handlerInput.requestEnvelope)
      : null;
    return (
      intentName === 'AMAZON.StopIntent' ||
      intentName === 'AMAZON.CancelIntent' ||
      intentName === 'AMAZON.PauseIntent' ||
      requestType === 'PlaybackController.PauseCommandIssued'
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .addAudioPlayerStopDirective()
      .getResponse();
  }
};

// ── AudioPlayer lifecycle events (Alexa requires these) ─────────────────────
const AudioPlayerEventHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope).startsWith('AudioPlayer.');
  },
  handle(handlerInput) {
    // Handle NearlyFinished — queue next track for seamless looping
    if (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'AudioPlayer.PlaybackNearlyFinished'
    ) {
      const token = handlerInput.requestEnvelope.context.AudioPlayer.token || 'track-0';
      const currentIndex = parseInt(token.split('-')[1]) || 0;
      const nextIndex = (currentIndex + 1) % audioData.length;
      const track = audioData[nextIndex];
      return handlerInput.responseBuilder
        .addAudioPlayerPlayDirective('ENQUEUE', track.url, `track-${nextIndex}`, 0, token)
        .getResponse();
    }
    return handlerInput.responseBuilder.getResponse();
  }
};

// ── Error handler ────────────────────────────────────────────────────────────
const ErrorHandler = {
  canHandle() { return true; },
  handle(handlerInput, error) {
    console.error('Error:', error);
    return handlerInput.responseBuilder
      .speak("Sorry, something went wrong. Try again.")
      .getResponse();
  }
};

// ── Session ended (required) ─────────────────────────────────────────────────
const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.getResponse();
  }
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    PlayIntentHandler,
    NextIntentHandler,
    StopIntentHandler,
    AudioPlayerEventHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
