/**
 * OpenAPI 3.1 specification for the FlashLearnAI.WitUS.Online Public API v1.
 */
export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'FlashLearnAI.WitUS.Online API',
    version: '1.0.0',
    description:
      'AI-powered flashcard generation and management API. Generate flashcards from text topics, manage sets, and browse public content.',
    contact: {
      name: 'FlashLearnAI.WitUS.Online Support',
      email: 'support@flashlearnai.witus.online',
    },
  },
  servers: [
    {
      url: '{baseUrl}',
      description: 'FlashLearn API server',
      variables: {
        baseUrl: {
          default: 'https://flashlearnai.witus.online',
        },
      },
    },
  ],
  security: [{ BearerAuth: [] }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http' as const,
        scheme: 'bearer',
        description:
          'API key obtained from the Developer Portal. Pass as `Authorization: Bearer fl_pub_...`',
      },
    },
    schemas: {
      Flashcard: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, description: 'Flashcard ID' },
          front: { type: 'string' as const, description: 'Question or term (front of card)' },
          back: { type: 'string' as const, description: 'Answer or definition (back of card)' },
        },
        required: ['front', 'back'],
      },
      FlashcardSet: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const },
          title: { type: 'string' as const },
          description: { type: 'string' as const },
          source: { type: 'string' as const, enum: ['Prompt', 'PDF', 'YouTube', 'Audio', 'Image', 'CSV'] },
          isPublic: { type: 'boolean' as const },
          cardCount: { type: 'integer' as const },
          rating: { type: 'number' as const },
          createdAt: { type: 'string' as const, format: 'date-time' },
        },
      },
      Category: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const },
          name: { type: 'string' as const },
          slug: { type: 'string' as const },
          description: { type: 'string' as const },
        },
      },
      Pagination: {
        type: 'object' as const,
        properties: {
          page: { type: 'integer' as const },
          limit: { type: 'integer' as const },
          total: { type: 'integer' as const },
          totalPages: { type: 'integer' as const },
        },
      },
      ApiError: {
        type: 'object' as const,
        properties: {
          error: {
            type: 'object' as const,
            properties: {
              code: { type: 'string' as const },
              message: { type: 'string' as const },
              details: { type: 'object' as const },
            },
            required: ['code', 'message'],
          },
          meta: {
            type: 'object' as const,
            properties: {
              requestId: { type: 'string' as const },
            },
          },
        },
      },
      SessionCompletedPayload: {
        type: 'object' as const,
        description: 'Canonical session.completed payload — returned by POST /sessions/:id/results AND fired via webhook. Same body either way.',
        required: ['type', 'sessionId', 'childId', 'completedAt', 'cards'],
        properties: {
          type: { type: 'string' as const, enum: ['session.completed'] },
          sessionId: { type: 'string' as const, format: 'uuid' as const },
          childId: { type: 'string' as const },
          completedAt: { type: 'string' as const, format: 'date-time' as const },
          cards: { type: 'array' as const, items: { type: 'object' as const, required: ['cardId', 'correctOnFirstAttempt', 'attempts', 'latencyMs'], properties: {
            cardId: { type: 'string' as const },
            standardCode: { type: 'string' as const, description: 'Primary standard code the card was tagged to' },
            correctOnFirstAttempt: { type: 'boolean' as const },
            attempts: { type: 'integer' as const, minimum: 1 },
            latencyMs: { type: 'integer' as const, minimum: 0, description: 'Total ms across all attempts on this card' },
          } } },
        },
      },
      UsageResponse: {
        type: 'object' as const,
        properties: {
          keyType: { type: 'string' as const },
          apiTier: { type: 'string' as const },
          period: {
            type: 'object' as const,
            properties: {
              start: { type: 'string' as const, format: 'date-time' },
              end: { type: 'string' as const, format: 'date-time' },
            },
          },
          usage: {
            type: 'object' as const,
            properties: {
              apiCalls: { type: 'integer' as const },
              generationCalls: { type: 'integer' as const },
              overageCalls: { type: 'integer' as const },
            },
          },
          limits: {
            type: 'object' as const,
            properties: {
              burstPerMinute: { type: 'integer' as const, nullable: true },
              monthlyGenerations: { type: 'integer' as const, nullable: true },
              monthlyApiCalls: { type: 'integer' as const, nullable: true },
            },
          },
        },
      },
    },
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query' as const,
        schema: { type: 'integer' as const, default: 1, minimum: 1 },
        description: 'Page number',
      },
      LimitParam: {
        name: 'limit',
        in: 'query' as const,
        schema: { type: 'integer' as const, default: 20, minimum: 1, maximum: 100 },
        description: 'Items per page',
      },
    },
  },
  paths: {
    '/api/v1/generate': {
      post: {
        operationId: 'generateFlashcards',
        summary: 'Generate flashcards from a topic',
        description:
          'Uses AI to generate a set of flashcards on the given topic. If a matching public set exists, returns it instead of generating new cards. This counts as a generation call against your monthly quota.',
        tags: ['Generate'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  topic: {
                    type: 'string' as const,
                    description: 'The subject to generate flashcards about',
                    example: 'Photosynthesis in plants',
                  },
                  title: {
                    type: 'string' as const,
                    description: 'Optional title for the created set (defaults to topic)',
                  },
                  description: {
                    type: 'string' as const,
                    description: 'Optional description for the set',
                  },
                },
                required: ['topic'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Flashcards generated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object' as const,
                  properties: {
                    data: {
                      type: 'object' as const,
                      properties: {
                        flashcards: {
                          type: 'array' as const,
                          items: { $ref: '#/components/schemas/Flashcard' },
                        },
                        setId: { type: 'string' as const },
                        source: { type: 'string' as const, enum: ['generated', 'shared'] },
                        cardCount: { type: 'integer' as const },
                      },
                    },
                    meta: {
                      type: 'object' as const,
                      properties: {
                        requestId: { type: 'string' as const },
                        rateLimit: {
                          type: 'object' as const,
                          properties: {
                            limit: { type: 'integer' as const },
                            remaining: { type: 'integer' as const },
                            reset: { type: 'integer' as const },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid input', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '429': { description: 'Rate limit or quota exceeded', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          '502': { description: 'AI generation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/api/v1/sets': {
      get: {
        operationId: 'listSets',
        summary: 'List your flashcard sets',
        tags: ['Sets'],
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
          { name: 'source', in: 'query' as const, schema: { type: 'string' as const }, description: 'Filter by source (Prompt, PDF, YouTube, etc.)' },
        ],
        responses: {
          '200': {
            description: 'List of flashcard sets',
            content: {
              'application/json': {
                schema: {
                  type: 'object' as const,
                  properties: {
                    data: {
                      type: 'object' as const,
                      properties: {
                        sets: { type: 'array' as const, items: { $ref: '#/components/schemas/FlashcardSet' } },
                        pagination: { $ref: '#/components/schemas/Pagination' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'createSet',
        summary: 'Create a flashcard set',
        tags: ['Sets'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  title: { type: 'string' as const, description: 'Set title' },
                  description: { type: 'string' as const },
                  isPublic: { type: 'boolean' as const, default: true },
                  flashcards: {
                    type: 'array' as const,
                    items: {
                      type: 'object' as const,
                      properties: {
                        front: { type: 'string' as const },
                        back: { type: 'string' as const },
                      },
                      required: ['front', 'back'],
                    },
                    minItems: 1,
                  },
                },
                required: ['title', 'flashcards'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Set created' },
          '400': { description: 'Invalid input', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/api/v1/sets/{id}': {
      get: {
        operationId: 'getSet',
        summary: 'Get a flashcard set with all cards',
        tags: ['Sets'],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const } }],
        responses: {
          '200': { description: 'Flashcard set with cards' },
          '404': { description: 'Set not found' },
        },
      },
      patch: {
        operationId: 'updateSet',
        summary: 'Update a flashcard set',
        tags: ['Sets'],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  title: { type: 'string' as const },
                  description: { type: 'string' as const },
                  isPublic: { type: 'boolean' as const },
                  flashcards: { type: 'array' as const, items: { type: 'object' as const, properties: { front: { type: 'string' as const }, back: { type: 'string' as const } }, required: ['front', 'back'] } },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Set updated' },
          '403': { description: 'Not the owner' },
          '404': { description: 'Set not found' },
        },
      },
      delete: {
        operationId: 'deleteSet',
        summary: 'Delete a flashcard set',
        tags: ['Sets'],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const } }],
        responses: {
          '200': { description: 'Set deleted' },
          '403': { description: 'Not the owner' },
          '404': { description: 'Set not found' },
        },
      },
    },
    '/api/v1/sets/explore': {
      get: {
        operationId: 'exploreSets',
        summary: 'Browse public flashcard sets',
        tags: ['Sets'],
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
          { name: 'search', in: 'query' as const, schema: { type: 'string' as const }, description: 'Search by title or description' },
          { name: 'category', in: 'query' as const, schema: { type: 'string' as const }, description: 'Filter by category' },
          { name: 'sort', in: 'query' as const, schema: { type: 'string' as const, enum: ['recent', 'popular'], default: 'recent' }, description: 'Sort order' },
        ],
        responses: {
          '200': { description: 'List of public sets with pagination' },
        },
      },
    },
    '/api/v1/categories': {
      get: {
        operationId: 'listCategories',
        summary: 'List all categories',
        tags: ['Categories'],
        responses: {
          '200': {
            description: 'List of categories',
            content: {
              'application/json': {
                schema: {
                  type: 'object' as const,
                  properties: {
                    data: {
                      type: 'object' as const,
                      properties: {
                        categories: { type: 'array' as const, items: { $ref: '#/components/schemas/Category' } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/usage': {
      get: {
        operationId: 'getUsage',
        summary: 'Get current billing period usage',
        description: 'Returns usage stats and limits for the API key used to authenticate this request.',
        tags: ['Usage'],
        responses: {
          '200': {
            description: 'Usage data for current period',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UsageResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/study/due-cards': {
      get: {
        operationId: 'getDueCards', summary: 'Get cards due for spaced repetition review',
        description: 'Returns flashcard sets with cards whose SM-2 review date has passed.',
        tags: ['Study'],
        parameters: [{ name: 'setId', in: 'query' as const, schema: { type: 'string' as const }, description: 'Filter to a specific set' }],
        responses: { '200': { description: 'Due cards grouped by set' } },
      },
    },
    '/api/v1/study/due-cards/schedule': {
      get: {
        operationId: 'getReviewSchedule', summary: 'Get upcoming review schedule forecast',
        tags: ['Study'],
        responses: { '200': { description: 'Review counts for today, tomorrow, this week, and 14-day breakdown' } },
      },
    },
    '/api/v1/study/sessions': {
      post: {
        operationId: 'createStudySession', summary: 'Start a study session',
        tags: ['Study'],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object' as const, required: ['setId'],
          properties: {
            setId: { type: 'string' as const, description: 'Flashcard set ID' },
            studyMode: { type: 'string' as const, enum: ['classic', 'multiple-choice', 'type-answer'], default: 'classic' },
            studyDirection: { type: 'string' as const, enum: ['front-to-back', 'back-to-front'], default: 'front-to-back' },
          },
        } } } },
        responses: { '201': { description: 'Session created with shuffled flashcards' } },
      },
    },
    '/api/v1/study/sessions/{id}/complete': {
      post: {
        operationId: 'completeStudySession', summary: 'Complete a study session with results',
        tags: ['Study'],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object' as const, required: ['results'],
          properties: { results: { type: 'array' as const, items: { type: 'object' as const, properties: {
            cardId: { type: 'string' as const }, isCorrect: { type: 'boolean' as const },
            timeSeconds: { type: 'number' as const }, confidenceRating: { type: 'integer' as const, minimum: 1, maximum: 5 },
          }, required: ['cardId', 'isCorrect', 'timeSeconds'] } } },
        } } } },
        responses: { '200': { description: 'Session completed with accuracy and duration stats' } },
      },
    },
    '/api/v1/study/evaluate-answer': {
      post: {
        operationId: 'evaluateAnswer', summary: 'AI-evaluate a typed answer',
        description: 'Uses AI to check if a user answer matches the correct answer, considering synonyms and typos. Counts as a generation call.',
        tags: ['Study'],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object' as const, required: ['userAnswer', 'correctAnswer'],
          properties: {
            userAnswer: { type: 'string' as const }, correctAnswer: { type: 'string' as const },
            question: { type: 'string' as const, description: 'Optional question for context' },
          },
        } } } },
        responses: { '200': { description: 'Evaluation result with similarity score (0-1) and feedback' } },
      },
    },
    '/api/v1/study/analytics/{setId}': {
      get: {
        operationId: 'getStudyAnalytics', summary: 'Get SM-2 spaced repetition analytics for a set',
        tags: ['Study'],
        parameters: [{ name: 'setId', in: 'path' as const, required: true, schema: { type: 'string' as const } }],
        responses: { '200': { description: 'Per-card SM-2 data (easiness factor, interval, repetitions, next review date)' } },
      },
    },
    '/api/v1/generate/batch': {
      post: {
        operationId: 'batchGenerate', summary: 'Generate flashcards for multiple topics',
        description: 'Enterprise feature: generate up to 10 topics in one request. Requires Pro or Enterprise tier.',
        tags: ['Generate'],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object' as const, required: ['topics'],
          properties: { topics: { type: 'array' as const, maxItems: 10, items: { type: 'object' as const, properties: {
            topic: { type: 'string' as const }, title: { type: 'string' as const }, description: { type: 'string' as const },
          }, required: ['topic'] } } },
        } } } },
        responses: { '201': { description: 'Batch results with per-topic status, cards, and set IDs' } },
      },
    },
    '/api/v1/versus/challenges': {
      post: {
        operationId: 'createChallenge', summary: 'Create a versus challenge',
        tags: ['Versus'],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object' as const, required: ['flashcardSetId'],
          properties: {
            flashcardSetId: { type: 'string' as const }, studyMode: { type: 'string' as const, enum: ['classic', 'multiple-choice'] },
            studyDirection: { type: 'string' as const, enum: ['front-to-back', 'back-to-front'] },
            scope: { type: 'string' as const, enum: ['direct', 'classroom', 'public'] },
            maxParticipants: { type: 'integer' as const },
          },
        } } } },
        responses: { '201': { description: 'Challenge created with shareable code' } },
      },
      get: {
        operationId: 'listChallenges', summary: 'List your challenges', tags: ['Versus'],
        parameters: [
          { name: 'status', in: 'query' as const, schema: { type: 'string' as const, enum: ['active', 'completed', 'expired'] } },
          { $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' },
        ],
        responses: { '200': { description: 'List of challenges with pagination' } },
      },
    },
    '/api/v1/versus/challenges/{id}': {
      get: { operationId: 'getChallenge', summary: 'Get challenge details', tags: ['Versus'],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const } }],
        responses: { '200': { description: 'Challenge details with participants and scores' } },
      },
    },
    '/api/v1/versus/challenges/{id}/play': {
      post: { operationId: 'playChallenge', summary: 'Start playing a challenge', tags: ['Versus'],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const } }],
        responses: { '200': { description: 'Session ID and ordered flashcards for the challenge' } },
      },
    },
    '/api/v1/versus/challenges/{id}/complete': {
      post: { operationId: 'completeChallenge', summary: 'Submit answers and get composite score', tags: ['Versus'],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const } }],
        responses: { '200': { description: 'Composite score (0-1000) with accuracy, speed, confidence, and streak breakdown' } },
      },
    },
    '/api/v1/versus/challenges/{id}/board': {
      get: { operationId: 'getChallengeBoard', summary: 'Get challenge leaderboard', tags: ['Versus'],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const } }],
        responses: { '200': { description: 'Ranked participants with scores' } },
      },
    },
    '/api/v1/versus/join': {
      post: { operationId: 'joinChallenge', summary: 'Join a challenge by code', tags: ['Versus'],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object' as const, required: ['challengeCode'],
          properties: { challengeCode: { type: 'string' as const, description: '6-character challenge code' } },
        } } } },
        responses: { '200': { description: 'Joined challenge details' } },
      },
    },
    '/api/v1/versus/open': {
      get: { operationId: 'browseOpenChallenges', summary: 'Browse open public challenges', tags: ['Versus'],
        parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }],
        responses: { '200': { description: 'List of active public challenges' } },
      },
    },
    '/api/v1/versus/stats': {
      get: { operationId: 'getVersusStats', summary: 'Get your versus statistics', tags: ['Versus'],
        responses: { '200': { description: 'Win/loss record, ELO rating, streaks, and composite score stats' } },
      },
    },
    '/api/v1/sessions': {
      post: {
        operationId: 'createEcosystemSession',
        summary: 'Schedule a child-scoped review deck',
        description: 'Generates a deck tagged to the given curriculum standards, persists an EcosystemSession record, schedules next-day delivery in the consumer-supplied tz (default UTC), and returns the sessionId. Counts as 1 generation + 1 API call.',
        tags: ['Ecosystem'],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' as const,
          required: ['childId', 'ageBand', 'standards', 'sourceContext'],
          properties: {
            childId: { type: 'string' as const, description: 'Consumer-issued opaque identifier. Scopes all session/mastery/delete data.' },
            ageBand: { type: 'string' as const, enum: ['4-7', '8-12', '13-18'] },
            standards: { type: 'array' as const, items: { type: 'object' as const, required: ['framework', 'code'], properties: {
              framework: { type: 'string' as const, example: 'indiana-k' },
              code: { type: 'string' as const, example: 'K.NS.1' },
            } } },
            sourceContext: { type: 'object' as const, required: ['consumer', 'completedAt'], properties: {
              consumer: { type: 'string' as const, example: 'wanderlearn-stories' },
              bookId: { type: 'string' as const },
              hubId: { type: 'string' as const },
              completedAt: { type: 'string' as const, format: 'date-time' as const },
            } },
            tz: { type: 'string' as const, description: 'IANA timezone for next-local-midnight scheduling. Defaults to UTC.', example: 'America/Indiana/Indianapolis' },
          },
        } } } },
        responses: {
          '201': { description: 'Session scheduled', content: { 'application/json': { schema: { type: 'object' as const, properties: {
            data: { type: 'object' as const, properties: {
              sessionId: { type: 'string' as const, format: 'uuid' as const },
              scheduledFor: { type: 'string' as const, format: 'date-time' as const },
              estimatedCardCount: { type: 'integer' as const },
            } },
          } } } } },
          '400': { description: 'Invalid input (e.g. unknown standard code)' },
          '401': { description: 'Missing or invalid API key' },
          '403': { description: 'API key lacks sessions:write permission' },
          '429': { description: 'Rate limit or monthly quota exceeded' },
          '502': { description: 'AI generation failed' },
        },
      },
    },
    '/api/v1/sessions/{sessionId}/results': {
      post: {
        operationId: 'submitSessionResults',
        summary: 'Submit attempts; receive canonical session.completed payload',
        description: 'Persists CardAttempt rows (idempotent on (sessionId, cardId, attemptNumber)), recomputes MasteryRollup state, marks the session completed, and dispatches the session.completed webhook to every active subscribed endpoint. The response body is byte-equivalent to the webhook body so consumers can update UI synchronously.',
        tags: ['Ecosystem'],
        parameters: [{ name: 'sessionId', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' as const } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' as const, required: ['cards'],
          properties: {
            cards: { type: 'array' as const, items: { type: 'object' as const, required: ['cardId', 'attempts'], properties: {
              cardId: { type: 'string' as const, description: 'ObjectId hex of the card from the generated deck' },
              attempts: { type: 'array' as const, items: { type: 'object' as const, required: ['isCorrect', 'latencyMs'], properties: {
                isCorrect: { type: 'boolean' as const },
                latencyMs: { type: 'integer' as const, minimum: 0 },
                attemptedAt: { type: 'string' as const, format: 'date-time' as const },
                confidenceRating: { type: 'integer' as const, minimum: 1, maximum: 5 },
              } } },
            } } },
          },
        } } } },
        responses: {
          '200': { description: 'Canonical session.completed payload (matches webhook body)', content: { 'application/json': { schema: { $ref: '#/components/schemas/SessionCompletedPayload' } } } },
          '400': { description: 'Invalid input' },
          '404': { description: 'Session not found for this API key' },
        },
      },
    },
    '/api/v1/mastery/{childId}': {
      get: {
        operationId: 'getMastery',
        summary: 'Per-standard mastery rollup for a child',
        description: 'Returns rolled-up state (exposed/practiced/demonstrated) per (framework, code) for a given childId. Returns 404 when the child has no rollup data — including after a cascade delete.',
        tags: ['Ecosystem'],
        parameters: [{ name: 'childId', in: 'path' as const, required: true, schema: { type: 'string' as const } }],
        responses: {
          '200': { description: 'Mastery rollup', content: { 'application/json': { schema: { type: 'object' as const, properties: {
            data: { type: 'object' as const, properties: {
              childId: { type: 'string' as const },
              standards: { type: 'array' as const, items: { type: 'object' as const, properties: {
                framework: { type: 'string' as const },
                code: { type: 'string' as const },
                state: { type: 'string' as const, enum: ['exposed', 'practiced', 'demonstrated'] },
                firstAttemptCorrectRate: { type: 'number' as const, minimum: 0, maximum: 1 },
                attemptCount: { type: 'integer' as const },
                lastAttemptAt: { type: 'string' as const, format: 'date-time' as const, nullable: true },
              } } },
            } },
          } } } } },
          '404': { description: 'No mastery data for this child' },
        },
      },
    },
    '/api/v1/children/{childId}': {
      delete: {
        operationId: 'deleteChild',
        summary: 'COPPA cascade delete — purge every artifact for this child',
        description: 'Cancels pending QStash jobs, deletes WebhookDelivery / CardAttempt / MasteryRollup / FlashcardSet / EcosystemSession rows scoped to this (apiKey, child) tuple, and writes a CascadePurgeLog audit row. Idempotent: re-call after a prior purge returns 200 with purgedRecordCount: 0. Privacy rights are free — does not count against quota.',
        tags: ['Ecosystem'],
        parameters: [{ name: 'childId', in: 'path' as const, required: true, schema: { type: 'string' as const } }],
        responses: {
          '200': { description: 'Cascade complete', content: { 'application/json': { schema: { type: 'object' as const, properties: {
            data: { type: 'object' as const, properties: {
              deleted: { type: 'boolean' as const, enum: [true] },
              purgedRecordCount: { type: 'integer' as const, minimum: 0 },
            } },
          } } } } },
          '404': { description: 'No records exist for this child and no prior purge log' },
        },
      },
    },
  },
  webhooks: {
    'session.completed': {
      post: {
        operationId: 'sessionCompletedWebhook',
        summary: 'Fired after a child completes a deck and the consumer POSTs results',
        description: 'FlashLearn AI POSTs your registered URL with the canonical session.completed payload. Headers: X-FlashLearn-Signature (sha256=hex of HMAC-SHA256 over raw body), X-FlashLearn-Delivery (UUID, idempotent across retries), X-FlashLearn-Event, X-FlashLearn-Timestamp (unix seconds). Retries up to 7 times (1m / 5m / 30m / 2h / 6h / 16h between attempts ≈ 24h36m total). Endpoint must respond 2xx within 10 seconds and dedupe on X-FlashLearn-Delivery.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SessionCompletedPayload' } } } },
        responses: {
          '200': { description: 'Acknowledged' },
          '4XX': { description: 'Triggers retry until exhausted, then dead-letter' },
          '5XX': { description: 'Triggers retry until exhausted, then dead-letter' },
        },
      },
    },
  },
  tags: [
    { name: 'Generate', description: 'AI-powered flashcard generation' },
    { name: 'Sets', description: 'Flashcard set management' },
    { name: 'Categories', description: 'Content categories' },
    { name: 'Study', description: 'Spaced repetition study sessions and analytics' },
    { name: 'Versus', description: 'Competitive challenge mode with scoring and leaderboards' },
    { name: 'Usage', description: 'API usage and billing' },
    { name: 'Ecosystem', description: 'Cross-product partner endpoints — child-scoped sessions, mastery rollups, COPPA cascade delete' },
  ],
};
