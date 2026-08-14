(function () {
  let chatServicePromise = null;
  let sanitizePromise = null;
  let conversationContextServicePromise = null;
  let agentResponseGuardServicePromise = null;
  const runtimeImport =
    typeof window !== 'undefined' && typeof window.__mentalImport === 'function'
      ? window.__mentalImport.bind(window)
      : (specifier) => Function('specifier', 'return import(specifier);')(specifier);

  function normalizeSendArgs(arg, hidden, inputElement) {
    let text = '';
    let isHidden = hidden;
    let isSilent = false;

    if (typeof arg === 'object' && arg !== null) {
      text = arg.text || '';
      isHidden = arg.hidden || false;
      isSilent = arg.silent || false;
    } else {
      text = arg;
    }

    if (text === null) {
      text = inputElement ? inputElement.value.trim() : '';
    }

    return { text, isHidden, isSilent };
  }

  function clearInputIfMatched(inputElement, text, emptyHeight = '44px') {
    if (!inputElement) return;
    if (text === inputElement.value.trim()) {
      inputElement.value = '';
      inputElement.style.height = emptyHeight;
    }
  }

  async function getChatService(url) {
    if (!chatServicePromise) {
      chatServicePromise = runtimeImport('/runtime/services/chatService.js').then((module) =>
        module.createChatService(fetch, url)
      );
    }
    return chatServicePromise;
  }

  async function getSanitizeHelpers() {
    if (!sanitizePromise) {
      sanitizePromise = runtimeImport('/runtime/utils/sanitizeText.js').then((module) => ({
        isReportLikeContent: module.isReportLikeContent,
        studentFacingReportPlaceholder: module.studentFacingReportPlaceholder
      }));
    }
    return sanitizePromise;
  }

  async function getConversationContextService() {
    if (!conversationContextServicePromise) {
      conversationContextServicePromise = runtimeImport('/runtime/services/conversationContextService.js').then((module) =>
        module.createConversationContextService()
      );
    }
    return conversationContextServicePromise;
  }

  async function getAgentResponseGuardService() {
    if (!agentResponseGuardServicePromise) {
      agentResponseGuardServicePromise = runtimeImport('/runtime/services/agentResponseGuardService.js').then((module) =>
        module.createAgentResponseGuardService()
      );
    }
    return agentResponseGuardServicePromise;
  }

  function renderVisibleBubble({ bubble, text, sanitizeHelpers, options }) {
    if (!bubble || !sanitizeHelpers || typeof options.updateBubble !== 'function') return;
    const studentText = sanitizeHelpers.isReportLikeContent(text)
      ? sanitizeHelpers.studentFacingReportPlaceholder(text)
      : text;
    const html = typeof options.parseHtml === 'function' ? options.parseHtml(studentText) : studentText;
    options.updateBubble({
      bubble,
      html,
      container: options.container
    });
  }

  async function sendConversation(options = {}) {
    const normalized = normalizeSendArgs(options.arg, options.hidden, options.inputElement);
    const text = normalized.text;
    const isHidden = normalized.isHidden;
    const isSilent = normalized.isSilent;

    if (!text) return false;

    if (typeof options.beforeSend === 'function') {
      options.beforeSend(text);
    }

    let userTurnResult = null;
    if (typeof options.recordUserTranscript === 'function') {
      userTurnResult = await options.recordUserTranscript(text, {
        hidden: isHidden,
        silent: isSilent
      });
    }

    let currentState = window.MentalSessionRuntime?.getState?.();
    const contextService = currentState ? await getConversationContextService() : null;
    let localContextPacket = contextService && currentState
      ? contextService.buildConversationContextPacket(currentState)
      : undefined;

    const reportTrigger = userTurnResult?.reportTrigger || options.automaticReportTrigger;
    const automaticReportUpdate = reportTrigger
      ? await window.MentalUploadRuntime?.prepareAutomaticReportUpdate?.({
          trigger: reportTrigger,
          gatewayUrl: '/api/workflow/report-to-feishu'
        })
      : null;
    if (options.requireAutomaticReportPayload && !automaticReportUpdate) {
      return false;
    }
    if (automaticReportUpdate) {
      currentState = window.MentalSessionRuntime?.getState?.();
      localContextPacket = contextService && currentState
        ? contextService.buildConversationContextPacket(currentState)
        : undefined;
      if (localContextPacket) {
        localContextPacket = {
          ...localContextPacket,
          agentInternalPayload: automaticReportUpdate.payload,
          agentInternalAudit: automaticReportUpdate.audit
        };
      }
    }

    const shouldFinalize = Boolean(options.forceAgentInternalFinalization) ||
      (!isHidden && (await window.MentalUploadRuntime?.shouldFinalizeFromUserTurn?.(text)));
    if (shouldFinalize) {
      const gateway = await window.MentalUploadRuntime?.getGatewayStatus?.('/api/workflow/status');
      if (gateway?.mode !== 'agent_internal') {
        await window.MentalUploadRuntime?.finalizeCurrentSession({
          gatewayUrl: '/api/workflow/report-to-feishu',
          statusUrl: '/api/workflow/status'
        });
      } else {
        const agentInternal = await window.MentalUploadRuntime?.prepareAgentInternalPayload?.({
          gatewayUrl: '/api/workflow/report-to-feishu'
        });
        if (options.forceAgentInternalFinalization && !agentInternal) return false;
        currentState = window.MentalSessionRuntime?.getState?.();
        localContextPacket = contextService && currentState
          ? contextService.buildConversationContextPacket(currentState)
          : undefined;
        if (localContextPacket && agentInternal) {
          localContextPacket = {
            ...localContextPacket,
            agentInternalPayload: agentInternal.payload,
            agentInternalAudit: agentInternal.audit
          };
        }
      }
    }

    if (!isHidden && typeof options.appendMessage === 'function') {
      options.appendMessage('user', text);
    }

    clearInputIfMatched(options.inputElement, text, options.emptyHeight || '44px');

    let aiBubble = null;
    if (!isSilent && typeof options.appendMessage === 'function') {
      aiBubble = options.appendMessage('agent', options.loadingHtml || '<i class="fa-solid fa-ellipsis fa-fade"></i>');
    }

    try {
      const service = await getChatService(options.url);
      const sanitizeHelpers = await getSanitizeHelpers();
      const request = {
        bot_id: options.botId,
        user_id: options.userId,
        user_name: options.userName,
        stream: true,
        auto_save_history: true,
        ...(localContextPacket ? { local_context_packet: localContextPacket } : {}),
        additional_messages: [{ role: 'user', content: text, content_type: 'text' }]
      };
      let raw = '';
      const responseMode = localContextPacket?.conversationPolicy?.responseMode;
      const responsePlan = localContextPacket?.responsePlan;

      for await (const event of service.send(request)) {
        if (event.type === 'error') {
          throw new Error(event.message);
        }
        if (event.type === 'delta') {
          raw += event.content;
        } else if (event.type === 'done') {
          break;
        }
      }

      const guard = await getAgentResponseGuardService();
      const initialRaw = raw;
      const guardDecision = guard.inspect({
        responseMode,
        responseGoal: responsePlan?.responseGoal,
        allowedQuestionGoal: responsePlan?.allowedQuestionGoal,
        questionPermission: responsePlan?.questionPermission,
        allowClosure: responsePlan?.allowClosure,
        recentAgentReplies: localContextPacket?.recentAgentEvidence,
        text: initialRaw
      });
      const fallbackInput = {
        responseMode,
        responseGoal: responsePlan?.responseGoal,
        allowedQuestionGoal: responsePlan?.allowedQuestionGoal,
        latestUserText: text,
        factsToReflect: responsePlan?.factsToReflect,
        recentAgentReplies: localContextPacket?.recentAgentEvidence
      };
      if (guardDecision.shouldRetry) {
        const repairInstruction =
          responsePlan?.responseGoal === 'safety' &&
          responsePlan?.allowedQuestionGoal === 'immediate_safety'
            ? 'Replace the previous reply. This is a safety-priority turn. Acknowledge the student, ask one direct question confirming whether they are currently safe, have already harmed themselves, or may act soon, and then give practical real-world support. Do not ask duration, impact, sleep, or any report field.'
            : 'Replace the previous reply. Respond naturally to the student\'s latest message and the local response plan. Do not collect report fields, mention hidden processing, ask a question when questions are forbidden, ask more than one question, or offer to end the conversation unless the local response plan allows closure.';
        const repairRequest = {
          ...request,
          response_repair_instruction: repairInstruction
        };
        let repairedRaw = '';
        for await (const event of service.send(repairRequest)) {
          if (event.type === 'error') {
            throw new Error(event.message);
          }
          if (event.type === 'delta') {
            repairedRaw += event.content;
          } else if (event.type === 'done') {
            break;
          }
        }

        const repairedDecision = guard.inspect({
          responseMode,
          responseGoal: responsePlan?.responseGoal,
          allowedQuestionGoal: responsePlan?.allowedQuestionGoal,
          questionPermission: responsePlan?.questionPermission,
          allowClosure: responsePlan?.allowClosure,
          recentAgentReplies: localContextPacket?.recentAgentEvidence,
          text: repairedRaw
        });
        raw = !repairedDecision.shouldRetry && repairedRaw.trim()
          ? repairedRaw
          : guard.buildFallback({ ...fallbackInput, avoidTexts: [initialRaw, repairedRaw] });
      } else if (!initialRaw.trim()) {
        raw = guard.buildFallback(fallbackInput);
      }

      if (!isSilent) {
        renderVisibleBubble({
          bubble: aiBubble,
          text: raw,
          sanitizeHelpers,
          options
        });
      }

      if (!isSilent && raw && typeof options.recordAgentTranscript === 'function') {
        await options.recordAgentTranscript(raw, {
          hidden: false,
          silent: false
        });

        if (window.MentalUploadRuntime?.shouldFinalizeFromAgentText?.(raw)) {
          const gateway = await window.MentalUploadRuntime?.getGatewayStatus?.('/api/workflow/status');
          if (gateway?.mode !== 'agent_internal') {
            await window.MentalUploadRuntime?.finalizeCurrentSession({
              gatewayUrl: '/api/workflow/report-to-feishu',
              statusUrl: '/api/workflow/status'
            });
          }
        }
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (options.errorHtml || '网络异常...');
      if (aiBubble && typeof options.updateBubble === 'function') {
        options.updateBubble({
          bubble: aiBubble,
          html: errorMessage,
          container: options.container
        });
      }
      console.error(`${options.logLabel || 'Chat'} Error:`, error);
      return false;
    }
  }

  window.MentalChatRuntime = {
    sendConversation
  };
})();
