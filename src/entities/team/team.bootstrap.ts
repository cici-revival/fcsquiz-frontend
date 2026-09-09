import { connectTeamsSSE, disconnectTeamsSSE } from './model/team.sse';

/**
 * Счётчик потребителей соединения.
 *
 * Стрим составов нужен и лендингу, и админке одновременно, а EventSource
 * один на приложение. С простым булевым флагом выход из админки закрывал
 * общее соединение, и лендинг под ним оставался без данных до перезагрузки
 * страницы. Соединение живёт, пока на него ссылается хотя бы один экран.
 */
let subscribers = 0;

export function bootstrapTeams() {
  subscribers += 1;

  if (subscribers === 1) {
    connectTeamsSSE();
  }
}

export function shutdownTeams() {
  if (subscribers === 0) {
    return;
  }

  subscribers -= 1;

  if (subscribers === 0) {
    disconnectTeamsSSE();
  }
}

/** Принудительное переподключение по кнопке «Повторить». */
export function restartTeams() {
  disconnectTeamsSSE();

  if (subscribers > 0) {
    connectTeamsSSE();
  }
}
