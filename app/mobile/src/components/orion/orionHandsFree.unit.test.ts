import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  shouldKeepHandsFreeConversationOpen,
  shouldRestartHandsFreeListening,
} from './orionHandsFree';

test('hands-free conversation stays open only for visible navigation sessions', () => {
  assert.equal(
    shouldKeepHandsFreeConversationOpen({
      interactionMode: 'navigation',
      sessionActive: true,
      visible: true,
    }),
    true,
  );
  assert.equal(
    shouldKeepHandsFreeConversationOpen({
      interactionMode: 'explore',
      sessionActive: true,
      visible: true,
    }),
    false,
  );
  assert.equal(
    shouldKeepHandsFreeConversationOpen({
      interactionMode: 'navigation',
      sessionActive: false,
      visible: true,
    }),
    false,
  );
});

test('hands-free restart is blocked while Orion is thinking or speaking', () => {
  assert.equal(
    shouldRestartHandsFreeListening({
      interactionMode: 'navigation',
      sessionActive: true,
      visible: true,
      isThinking: true,
      isSpeaking: false,
    }),
    false,
  );
  assert.equal(
    shouldRestartHandsFreeListening({
      interactionMode: 'navigation',
      sessionActive: true,
      visible: true,
      isThinking: false,
      isSpeaking: true,
    }),
    false,
  );
});

test('hands-free restart allows silent recovery for no-speech errors', () => {
  assert.equal(
    shouldRestartHandsFreeListening({
      interactionMode: 'navigation',
      sessionActive: true,
      visible: true,
      isThinking: false,
      isSpeaking: false,
      errorMessage: '7/No speech input',
    }),
    true,
  );
  assert.equal(
    shouldRestartHandsFreeListening({
      interactionMode: 'navigation',
      sessionActive: true,
      visible: true,
      isThinking: false,
      isSpeaking: false,
      errorMessage: 'service disconnected',
    }),
    false,
  );
});
