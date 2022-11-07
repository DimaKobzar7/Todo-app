import React, {
  useState,
  useEffect,
  useRef,
  useContext,
} from 'react';

import { AuthContext } from './components/Auth/AuthContext';

import {
  getTodos,
  postTodo,
  removeTodo,
  changeTodoStatus,
  changeTodoTitle,
} from './api/todos';

import { Todo } from './types/Todo';
import { User } from './types/User';

import { FilterTypes } from './types/FilterTypes';
import { ErrorMessage } from './types/ErrorMessage';

import { Header } from './components/Header/Header';
import { TodoList } from './components/TodoList/TodoList';
import { Footer } from './components/Footer/Footer';
import { ErrorNotification } from
  './components/ErrorNotification/ErrorNotification';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);

  const [filterType, setFilterType] = useState<string>(FilterTypes.All);

  const [error, setError] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [title, setTitle] = useState('');

  const [changeTitle, setChangeTitle] = useState('');

  const [selectedTodoId, setSelectedTodoId] = useState<number | null>(null);

  const [completedTodos, setCompletedTodos] = useState<number[]>([]);

  const [isDisabled, setIsDisabled] = useState(false);

  const [doubleClickTodoId, setDoubleClickTodoId]
    = useState<number | null>(null);

  const user = useContext<User | null>(AuthContext);
  const newTodoField = useRef<HTMLInputElement>(null);

  const changeStatusTodo = (todoId: number, status: boolean) => {
    setSelectedTodoId(todoId);
    changeTodoStatus(todoId, !status)
      .then(() => {
        setTodos(prevTodos => (
          prevTodos.map(todo => {
            if (todo.id === todoId) {
              return { ...todo, completed: !status };
            }

            return todo;
          })
        ));
      })
      .catch(() => {
        setError(true);
        setErrorMessage(ErrorMessage.RewriteFail);
      }).finally(() => {
        setSelectedTodoId(null);
      });
  };

  const isDoubleClicked = (todoId: number | null, titleTodo: string) => {
    setChangeTitle(titleTodo);
    setDoubleClickTodoId(todoId);
  };

  const changeTitleTodo = (
    todoId: number,
    todoTitle: string,
    event: React.FocusEvent<HTMLInputElement> | null,
  ) => {
    const todoOnChange = todos.find(todo => todo.id === todoId);

    if (event?.target) {
      setDoubleClickTodoId(null);
    }

    if (todoOnChange?.title === todoTitle) {
      return;
    }

    setDoubleClickTodoId(null);

    setSelectedTodoId(todoId);

    changeTodoTitle(todoId, todoTitle)
      .then(() => {
        setTodos(prevTodos => (
          prevTodos.map(todo => {
            if (todo.id === todoId) {
              return { ...todo, title: todoTitle };
            }

            return todo;
          })
        ));
      })
      .catch(() => {
        setError(true);
        setErrorMessage(ErrorMessage.RewriteFail);
      })
      .finally(() => {
        setSelectedTodoId(null);
        setDoubleClickTodoId(null);
      });
  };

  const onKeyDownTitleTodo = (
    event: React.KeyboardEvent<HTMLInputElement>,
    todoId: number,
    todoTitle: string,
  ) => {
    if (event.key === 'Escape') {
      isDoubleClicked(null, todoTitle);
    }

    if (event.key === 'Enter') {
      setDoubleClickTodoId(null);
      changeTitleTodo(todoId, todoTitle, null);
    }
  };

  const changeStatusAll = async () => {
    const allStatus = todos.some(todo => todo.completed === false);

    const todosIds = todos
      .filter(todoStatus => todoStatus.completed !== allStatus)
      .map(todo => todo.id);

    setCompletedTodos(todosIds);

    try {
      await Promise.all(todosIds.map(async (todoId) => {
        await changeTodoStatus(todoId, allStatus);

        setTodos(prevTodos => (
          prevTodos.map(todo => {
            if (todo.id === todoId) {
              return {
                ...todo,
                completed: allStatus,
              };
            }

            return todo;
          })
        ));
      }));
    } catch {
      setError(true);
      setErrorMessage(ErrorMessage.RewriteFail);
    } finally {
      setCompletedTodos([]);
    }
  };

  const filteredTodos = todos.filter(todo => {
    switch (filterType) {
      case FilterTypes.All:
        return todo;

      case FilterTypes.Active:
        return !todo.completed && FilterTypes.Active;

      case FilterTypes.Completed:
        return todo.completed && FilterTypes.Completed;

      default:
        return null;
    }
  });

  useEffect(() => {
    getTodos(user?.id || 0).then(response => {
      setTodos(response);
    }).catch(() => {
      setErrorMessage(ErrorMessage.LoadFail);
      setError(true);
    });
  }, [errorMessage]);

  useEffect(() => {
    if (newTodoField.current) {
      newTodoField.current.focus();
    }
  }, [isDisabled]);

  const handleFilterType = (type: string) => {
    setFilterType(type);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim()) {
      setErrorMessage(ErrorMessage.TitleEmpty);
      setTitle('');
      setError(true);

      return;
    }

    setIsDisabled(true);

    const copyTodos = [...todos];

    setTodos(prev => {
      return [...prev, {
        id: 0,
        userId: user?.id || 0,
        completed: false,
        title,
      }];
    });

    setSelectedTodoId(0);

    postTodo(user?.id || 0, title)
      .then(newTodo => {
        setIsDisabled(false);
        setTodos([...copyTodos, newTodo]);
      })
      .catch(() => {
        setError(true);
        setIsDisabled(false);
        setErrorMessage(ErrorMessage.AddFail);

        setTodos((prev) => {
          return prev.filter(oneTodo => {
            return oneTodo.id !== 0;
          });
        });
      })
      .finally(() => {
        setSelectedTodoId(0);
        setTitle('');
      });
  };

  const removeError = (boolean: boolean) => {
    setError(boolean);
  };

  const deleteTodo = (todoId: number) => {
    setSelectedTodoId(todoId);

    removeTodo(todoId)
      .then(() => {
        setSelectedTodoId(todoId);
        setTodos(prevTodos => prevTodos
          .filter(todo => todo.id !== todoId));
      })
      .catch(() => {
        setError(true);
        setErrorMessage(ErrorMessage.DeleteFail);
      })
      .finally(() => {
        setSelectedTodoId(null);
      });
  };

  const clearTable = async () => {
    const filterTodos = todos
      .filter(todo => todo.completed)
      .map(todo => todo.id);

    setCompletedTodos(filterTodos);

    try {
      await Promise.all(filterTodos.map(async (todoId) => {
        await removeTodo(todoId);

        setTodos(prevTodos => prevTodos
          .filter(todo => {
            return todo.id !== todoId;
          }));
      }));
    } catch {
      setError(true);
      setErrorMessage(ErrorMessage.DeleteFail);
    } finally {
      setCompletedTodos([]);
    }
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">

        <Header
          handleSubmit={handleSubmit}
          newTodoField={newTodoField}
          setTitle={setTitle}
          isDisabled={isDisabled}
          title={title}
          changeStatusAll={changeStatusAll}
          todos={todos}
        />

        <TodoList
          filteredTodos={filteredTodos}
          deleteTodo={deleteTodo}
          selectedTodoId={selectedTodoId}
          completedTodos={completedTodos}
          isDoubleClicked={isDoubleClicked}
          doubleClickTodoId={doubleClickTodoId}
          changeTitle={changeTitle}
          setChangeTitle={setChangeTitle}
          changeStatusTodo={changeStatusTodo}
          changeTitleTodo={changeTitleTodo}
          onKeyDownTitleTodo={onKeyDownTitleTodo}
        />
        <Footer
          clearTable={clearTable}
          handleFilterType={handleFilterType}
          filterType={filterType}
          filteredTodos={filteredTodos}
        />

      </div>

      <ErrorNotification
        error={error}
        removeError={removeError}
        errorMessage={errorMessage}
        setError={setError}
      />
    </div>
  );
};

// моя проблема с получением данных после перезагрузки в том что я в зене переписывал свои туду а не локально поэтому изменения сразу не были видны
// также я передавал в патч значения что не менял
// у меня проблема с иконкой хрестика в сообщении об ошибке. Когда сообщение не видно то если найти место крестика то будет курсор поинтер
// бульма ломает стили крестика если я пытаюсь что то добавить
// disabled не влияет на стиль курсора
// если я сделаю отдельно форму для смены тайтлов тудушек то мне все равно придется передавать кучу пропсов
// из туду листа в форму тогда надо внутрь формы кидать стейты или в нее кидать функции чтобы было меньше
// если делать отдельніе компоненті то надо по ним все из апа раскидывать и тогда пропсов будет мньше для передачи
// сделай тудушку отдельным компонентом
// если я это сделаю то она без мапа как автономный компонент не будет существовать
// так как я из мапа беру инфу для рендера, а если вставлю в тудушку сразу то она в мепе не будет работать
// или мы всегда будем кидать в нее доп пропсы если она будет одна (тудушка)
// import React, {
//   useState,
//   useEffect,
//   useRef,
//   useContext,
// } from 'react';

// import { AuthContext } from './components/Auth/AuthContext';

// import {
//   getTodos,
//   postTodo,
//   removeTodo,
//   changeTodoStatus,
//   changeTodoTitle,
// } from './api/todos';

// import { Todo } from './types/Todo';
// import { User } from './types/User';

// import { FilterTypes } from './types/FilterTypes';
// import { ErrorMessage } from './types/ErrorMessage';

// import { Header } from './components/Header/Header';
// import { TodoList } from './components/TodoList/TodoList';
// import { Footer } from './components/Footer/Footer';
// import { ErrorNotification } from
//   './components/ErrorNotification/ErrorNotification';

// export const App: React.FC = () => {
//   const [todos, setTodos] = useState<Todo[]>([]);

//   const [filterType, setFilterType] = useState<string>(FilterTypes.All);

//   const [error, setError] = useState(false);

//   const [errorMessage, setErrorMessage] = useState<string | null>(null);

//   const [title, setTitle] = useState('');

//   // этот для инпута что после 2го клика появляется
//   const [changeTitle, setChangeTitle] = useState('');

//   const [selectedTodoId, setSelectedTodoId] = useState<number | null>(null);

//   const [completedTodos, setCompletedTodos] = useState<number[]>([]);

//   const [isDisabled, setIsDisabled] = useState(false);

//   // этот чтобы выбрать только ту тудушку на которой 2 раза кликнул
//   const [doubleClickTodoId, setDoubleClickTodoId]
//     = useState<number | null>(null);

//   const user = useContext<User | null>(AuthContext);
//   const newTodoField = useRef<HTMLInputElement>(null);

//   // функция для смены статуса в апи и на экране на галочку
//   const changeStatusTodo = (todoId: number, status: boolean) => {
//     setSelectedTodoId(todoId);
//     // console.log(status, !status);
//     changeTodoStatus(todoId, !status)
//       .then(() => {
//         // setSelectedTodoId(null);
//         setTodos(prevTodos => (
//           // проблема была в том что я обновлял данные на сервере но не обновлял у себя поэтому и кллассы что к выполненым тудушкам были привязаны, не работали
//           prevTodos.map(todo => {
//             if (todo.id === todoId) {
//               // тут обновление статуса
//               return { ...todo, completed: !status };
//             }

//             return todo;
//           })
//         ));
//       })
//       .catch(() => {
//         setError(true);
//         setErrorMessage(ErrorMessage.RewriteFail);
//       }).finally(() => {
//         setSelectedTodoId(null);
//       });
//   };

//   // функция двойного клика по тудушке
//   const isDoubleClicked = (todoId: number | null, titleTodo: string) => {
//     // setDoubleClick(boolean);
//     // тут из замыкания в мепе я получаю тайтл для стейта что контролит инпут тудушки
//     setChangeTitle(titleTodo);
//     setDoubleClickTodoId(todoId);
//     // setSelectedTodoId(todoId);
//   };

//   // функция для смены тайтла
//   const changeTitleTodo = (
//     todoId: number,
//     todoTitle: string,
//     event: React.FocusEvent<HTMLInputElement> | null,
//   ) => {
//     const todoOnChange = todos.find(todo => todo.id === todoId);

//     if (event?.target) {
//       setDoubleClickTodoId(null);
//     }

//     // todoTitle меняется при инпуте
//     if (todoOnChange?.title === todoTitle) {
//       return;
//     }

//     // это убирает мой инпут и пользователь видет спан с текстом
//     setDoubleClickTodoId(null);

//     setSelectedTodoId(todoId);

//     changeTodoTitle(todoId, todoTitle)
//       .then(() => {
//         setTodos(prevTodos => (
//           // проблема была в том что я обновлял данные на сервере но не обновлял у себя поэтому и кллассы что к выполненым тудушкам были привязаны, не работали
//           prevTodos.map(todo => {
//             if (todo.id === todoId) {
//               return { ...todo, title: todoTitle };
//             }

//             return todo;
//           })
//         ));
//       })
//       .catch(() => {
//         setError(true);
//         setErrorMessage(ErrorMessage.RewriteFail);
//       })
//       .finally(() => {
//         setSelectedTodoId(null);
//         setDoubleClickTodoId(null);
//       });
//   };

//   const onKeyDownTitleTodo = (
//     event: React.KeyboardEvent<HTMLInputElement>,
//     todoId: number,
//     todoTitle: string,
//   ) => {
//     if (event.key === 'Escape') {
//       isDoubleClicked(null, todoTitle);
//     }

//     if (event.key === 'Enter') {
//       // console.log('save data');
//       // чтобы фокус инпута убрать
//       setDoubleClickTodoId(null);
//       changeTitleTodo(todoId, todoTitle, null);
//     }
//   };

//   // проблемы была что я после фильтрации хотел поставить пустой массив без айди в changeTodoStatus и ничего не происходило
//   const changeStatusAll = async () => {
//     // если хоть один элемент есть фолз то some вернет тру
//     const allStatus = todos.some(todo => todo.completed === false);
//     // отслеживает то что не окончено то есть то что имеет статус фолз
//     const todosIds = todos
//     // получается что я показываю айди тех тудушек что не имееют статус тру
//     // а после отправки на сервер все меняется на противоположные значения
//       .filter(todoStatus => todoStatus.completed !== allStatus)
//       .map(todo => todo.id);

//     setCompletedTodos(todosIds);

//     try {
//       // без async и await не отображается лоудер
//       // наверное это из за того что когда мы их используем то код ждет выполнения промис ол и это время тратится и за это время
//       // крутится лоудер а без них все происходит мгновенно и лоудер сразу ставится и сразу убирается
//       await Promise.all(todosIds.map(async (todoId) => {
//         // тут я делаю колбек мапа асинхронным async и этот меп ждет пока
//         // removeTodo(todoId) не выполнется
//         // await setSelectedTodoId(todoId);

//         await changeTodoStatus(todoId, allStatus);

//         setTodos(prevTodos => (
//           prevTodos.map(todo => {
//             if (todo.id === todoId) {
//               // тут обновление статуса
//               return {
//                 ...todo,
//                 completed: allStatus,
//               };
//             }

//             return todo;
//           })
//         ));
//         // setCompletedTodos([]);
//       }));
//     } catch {
//       setError(true);
//       setErrorMessage(ErrorMessage.RewriteFail);
//     } finally {
//       setCompletedTodos([]);
//     }
//   };

//   if (error) {
//     setTimeout(() => {
//       setError(false);
//     }, 3000);
//   }

//   const filteredTodos = todos.filter(todo => {
//     switch (filterType) {
//       case FilterTypes.All:
//         return todo;

//       case FilterTypes.Active:
//         return !todo.completed && FilterTypes.Active;

//       case FilterTypes.Completed:
//         return todo.completed && FilterTypes.Completed;

//       default:
//         return null;
//     }
//   });

//   useEffect(() => {
//     getTodos(user?.id || 0).then(response => {
//       setTodos(response);
//     }).catch(() => {
//       setErrorMessage(ErrorMessage.LoadFail);
//       setError(true);
//     });
//   }, [errorMessage]);

//   useEffect(() => {
//     if (newTodoField.current) {
//       newTodoField.current.focus();
//     }
//   }, [isDisabled]);

//   const handleFilterType = (type: string) => {
//     setFilterType(type);
//   };

//   const handleSubmit = (event: React.FormEvent) => {
//     event.preventDefault();

//     if (!title.trim()) {
//       setErrorMessage(ErrorMessage.TitleEmpty);
//       setTitle('');
//       setError(true);

//       return;
//     }

//     setIsDisabled(true);

//     // мы делаем копию без учета временной тудушки с айд 0
//     // потом мы в эту копию кладем новую тудушку что уже на сервере а та что с 0 индексом не сохраняется
//     // то есть она видна пока из сервера в копию не вписалась новая тудушка
//     const copyTodos = [...todos];

//     // console.log(copyTodos);
//     // эта тудушка отображается пока реальная не загрузится на сервер
//     // и мы ее не возьмем в переборе
//     // optimistic response это
//     setTodos(prev => {
//       return [...prev, {
//         id: 0,
//         userId: user?.id || 0,
//         completed: false,
//         title,
//       }];
//     });

//     setSelectedTodoId(0);

//     postTodo(user?.id || 0, title)
//       .then(newTodo => {
//         setIsDisabled(false);
//         setTodos([...copyTodos, newTodo]);
//       })
//       .catch(() => {
//         setError(true);
//         setIsDisabled(false);
//         setErrorMessage(ErrorMessage.AddFail);

//         setTodos((prev) => {
//           return prev.filter(oneTodo => {
//             return oneTodo.id !== 0;
//           });
//         });
//         // пропишу файнели
//       })
//       .finally(() => {
//         setSelectedTodoId(0);
//         setTitle('');
//       });

//     // setSelectedTodoId(0);

//     // setTitle('');
//   };

//   const removeError = (boolean: boolean) => {
//     setError(boolean);
//   };

//   const deleteTodo = (todoId: number) => {
//     setSelectedTodoId(todoId);

//     removeTodo(todoId)
//       .then(() => {
//         setSelectedTodoId(todoId);
//         // возможно это не нужно если файнели
//         // setErrorMessage(null);
//         setTodos(prevTodos => prevTodos
//           .filter(todo => todo.id !== todoId));
//       })
//       .catch(() => {
//         setError(true);
//         setErrorMessage(ErrorMessage.DeleteFail);
//       })
//       .finally(() => {
//         // setError(true);
//         setSelectedTodoId(null);
//         // setErrorMessage(null);
//       });
//   };

//   const clearTable = async () => {
//     const filterTodos = todos
//       .filter(todo => todo.completed)
//       .map(todo => todo.id);

//     setCompletedTodos(filterTodos);

//     try {
//       await Promise.all(filterTodos.map(async (todoId) => {
//         // тут я делаю колбек мапа асинхронным async и этот меп ждет пока
//         // removeTodo(todoId) не выполнется
//         await removeTodo(todoId);

//         // это же работает мгновенно
//         setTodos(prevTodos => prevTodos
//           .filter(todo => {
//             return todo.id !== todoId;
//           }));
//       }));
//     } catch {
//       setError(true);
//       setErrorMessage(ErrorMessage.DeleteFail);
//       // если есть файнели то это может и не нужно
//       // setCompletedTodos([]);
//     } finally {
//       setCompletedTodos([]);
//     }
//   };

//   // console.log(todos);

//   return (
//     <div className="todoapp">
//       <h1 className="todoapp__title">todos</h1>

//       <div className="todoapp__content">

//         <Header
//           handleSubmit={handleSubmit}
//           newTodoField={newTodoField}
//           setTitle={setTitle}
//           isDisabled={isDisabled}
//           title={title}
//           changeStatusAll={changeStatusAll}
//           todos={todos}
//         />

//         <TodoList
//           filteredTodos={filteredTodos}
//           deleteTodo={deleteTodo}
//           selectedTodoId={selectedTodoId}
//           completedTodos={completedTodos}
//           isDoubleClicked={isDoubleClicked}
//           doubleClickTodoId={doubleClickTodoId}
//           changeTitle={changeTitle}
//           setChangeTitle={setChangeTitle}
//           changeStatusTodo={changeStatusTodo}
//           changeTitleTodo={changeTitleTodo}
//           onKeyDownTitleTodo={onKeyDownTitleTodo}
//         />
//         <Footer
//           clearTable={clearTable}
//           handleFilterType={handleFilterType}
//           filterType={filterType}
//           filteredTodos={filteredTodos}
//         />

//       </div>

//       <ErrorNotification
//         error={error}
//         removeError={removeError}
//         errorMessage={errorMessage}
//       />
//     </div>
//   );
// };
// // баг с тайтлом, он записывается на сервер но после перезапуска но при этом на экране изменения видны либо то консоль лог меня путает
// // если ничего не ввел в инпут и просто убрал фокус с тудушки в которой что то есть то будет пустота, это баг?
// // и стили обратно на верстку без формы не переключаются

// // для тогла что все ставит в выполненые или нет используй переменные из мепа или массив что стоит на кнопку клеар
// import React, {
//   useState,
//   useEffect,
//   useRef,
//   useContext,
// } from 'react';

// import { AuthContext } from './components/Auth/AuthContext';

// import {
//   getTodos,
//   postTodo,
//   removeTodo,
//   changeTodoStatus,
//   changeTodoTitle,
// } from './api/todos';

// import { Todo } from './types/Todo';
// import { User } from './types/User';

// import { FilterTypes } from './types/FilterTypes';
// import { ErrorMessage } from './types/ErrorMessage';

// import { Header } from './components/Header/Header';
// import { TodoList } from './components/TodoList/TodoList';
// import { Footer } from './components/Footer/Footer';
// import { ErrorNotification } from
//   './components/ErrorNotification/ErrorNotification';

// export const App: React.FC = () => {
//   const [todos, setTodos] = useState<Todo[]>([]);

//   const [filterType, setFilterType] = useState<string>(FilterTypes.All);

//   const [error, setError] = useState(false);

//   const [errorMessage, setErrorMessage] = useState<string | null>(null);

//   const [title, setTitle] = useState('');

//   const [selectedTodoId, setSelectedTodoId] = useState<number | null>(null);

//   const [isAdding, setIsAdding] = useState(false);

//   const [completedTodos, setCompletedTodos] = useState<number[]>([]);

//   // новые изменения ниже
//   // попробую вообще через наличие айди открывать форму а не тру фолз
//   // const [doubleClick, setDoubleClick] = useState(false);
//   // нужен новый стейт для новой формы?

//   // этот для инпута что после 2го клика появляется
//   const [changeTitle, setChangeTitle] = useState('');

//   // этот чтобы выбрать только ту тудушку на которой 2 раза кликнул
//   const [doubleClickTodoId, setDoubleClickTodoId]
//     = useState<number | null>(null);

//   // сохраняет статус выполнения тудушки
//   // но оно мне в принципе не нужно и можно цеплятся сразу за completed что в мепе
//   const [todoStatus, setTodoStatus] = useState(false);

//   // айди тудушки на которую кликнул в чекбокс где галочка
//   const [todoStatusId, setTodoStatusId] = useState<number | null>(null);

//   const user = useContext<User | null>(AuthContext);
//   const newTodoField = useRef<HTMLInputElement>(null);

//   // console.log(changeTitle);
//   // console.log(doubleClickTodoId);
//   // функция для смены статуса в апи и на экране на галочку
//   const changeStatusTodo = (todoId: number, status: boolean) => {
//     setSelectedTodoId(todoId);
//     // console.log(status, !status);
//     changeTodoStatus(todoId, !status)
//       .then(() => {
//         // походу мне не нужно добавлять в стейт ничего оно и так перезаписывает
//         // setTodos(response);
//         // console.log(response);
//         // setTodoStatusId(todoId);
//         setSelectedTodoId(null);
//         setTodos(prevTodos => (
//           // проблема была в том что я обновлял данные на сервере но не обновлял у себя поэтому и кллассы что к выполненым тудушкам были привязаны, не работали
//           prevTodos.map(todo => {
//             if (todo.id === todoId) {
//               // тут обновление статуса
//               return { ...todo, completed: !status };
//             }

//             return todo;
//           })
//         ));
//       })
//       .catch(() => {
//         setError(true);
//         setErrorMessage('как же я устал от этого');
//       }).finally(() => {
//         setSelectedTodoId(null);
//       });
//   };

//   // функция двойного клика по тудушке
//   const isClicked = (todoId: number, titleTodo: string) => {
//     // setDoubleClick(boolean);
//     // тут из замыкания в мепе я получаю тайтл для стейта что контролит инпут тудушки
//     setChangeTitle(titleTodo);
//     setDoubleClickTodoId(todoId);
//     // setSelectedTodoId(todoId);
//   };

//   // функция для смены тайтла
//   // она работает но после перезагрузки а на 1й раз нет записи, записывается пустота которую можно только в консоле отследить
//   const changeTitleTodo = (todoId: number, todoTitle: string) => {
//     // мне нужен стейт чтобы выбирать конкретную тудушку в условии что в тудулист
//     console.log(todoId, todoTitle);
//     setSelectedTodoId(todoId);
//     console.log(doubleClickTodoId);
//     changeTodoTitle(todoId, todoTitle)
//       .then((response) => {
//         setSelectedTodoId(null);
//         console.log(response);
//         setTodos(prevTodos => (
//           // проблема была в том что я обновлял данные на сервере но не обновлял у себя поэтому и кллассы что к выполненым тудушкам были привязаны, не работали
//           prevTodos.map(todo => {
//             if (todo.id === todoId) {
//               // тут обновление статуса
//               return { ...todo, title };
//             }

//             return todo;
//           })
//         ));
//       })
//       .catch(() => {
//         setError(true);
//         setErrorMessage('Когда это уже закончится');
//       })
//       .finally(() => {
//         setSelectedTodoId(null);
//         // без setDoubleClickTodoId(null); работает запись нового тайтла
//         // и сейчас она работает но через перезапись и с багами
//         setDoubleClickTodoId(null);
//       });
//   };

//   // const onBlurSetTitleTodo = () => {

//   // };

//   // const onKeyDownSetTitleTodo = () => {

//   // };

//   console.log(todos);

//   if (error) {
//     setTimeout(() => {
//       setError(false);
//     }, 3000);
//   }

//   const filteredTodos = todos.filter(todo => {
//     switch (filterType) {
//       case FilterTypes.All:
//         return todo;

//       case FilterTypes.Active:
//         return !todo.completed && FilterTypes.Active;

//       case FilterTypes.Completed:
//         return todo.completed && FilterTypes.Completed;

//       default:
//         return null;
//     }
//   });

//   useEffect(() => {
//     getTodos(user?.id || 0).then(response => {
//       setTodos(response);
//     }).catch(() => {
//       setErrorMessage(ErrorMessage.LoadFail);
//       setError(true);
//     });
//   }, [errorMessage]);

//   useEffect(() => {
//     if (newTodoField.current) {
//       newTodoField.current.focus();
//     }
//   }, [isAdding]);

//   const handleFilterType = (type: string) => {
//     setFilterType(type);
//   };

//   const handleSubmit = (event: React.FormEvent) => {
//     event.preventDefault();

//     if (!title.trim()) {
//       setErrorMessage(ErrorMessage.TitleEmpty);
//       setTitle('');
//       setError(true);

//       return;
//     }

//     setIsAdding(true);

//     const copyTodos = [...todos];

//     setTodos(prev => {
//       return [...prev, {
//         id: 0,
//         userId: user?.id || 0,
//         completed: false,
//         title,
//       }];
//     });

//     setSelectedTodoId(0);

//     postTodo(user?.id || 0, title)
//       .then(newTodo => {
//         setIsAdding(false);
//         setTodos([...copyTodos, newTodo]);
//       })
//       .catch(() => {
//         setError(true);
//         setIsAdding(false);
//         setErrorMessage(ErrorMessage.AddFail);

//         setTodos((prev) => {
//           return prev.filter(oneTodo => {
//             return oneTodo.id !== 0;
//           });
//         });
//       });

//     setSelectedTodoId(0);

//     setTitle('');
//   };

//   const removeError = (boolean: boolean) => {
//     setError(boolean);
//   };

//   const deleteTodo = (todoId: number) => {
//     setSelectedTodoId(todoId);

//     removeTodo(todoId)
//       .then(() => {
//         setSelectedTodoId(todoId);
//         setErrorMessage(null);
//         setTodos(prevTodos => prevTodos
//           .filter(todo => todo.id !== todoId));
//       })
//       .catch(() => {
//         setError(true);
//         setErrorMessage(ErrorMessage.DeleteFail);
//       })
//       .finally(() => {
//         setSelectedTodoId(null);
//       });
//   };

//   const clearTable = async () => {
//     const filterTodos = todos
//       .filter(todo => todo.completed)
//       .map(todo => todo.id);

//     setCompletedTodos(filterTodos);

//     try {
//       await Promise.all(filterTodos.map(async (todoId) => {
//         // тут я делаю колбек мапа асинхронным async и этот меп ждет пока
//         // removeTodo(todoId) не выполнется
//         await removeTodo(todoId);

//         // это же работает мгновенно
//         setTodos(prevTodos => prevTodos
//           .filter(todo => {
//             return todo.id !== todoId;
//           }));
//       }));
//     } catch {
//       setError(true);
//       setErrorMessage(ErrorMessage.DeleteFail);
//       setCompletedTodos([]);
//     }
//   };

//   return (
//     <div className="todoapp">
//       <h1 className="todoapp__title">todos</h1>

//       <div className="todoapp__content">

//         <Header
//           handleSubmit={handleSubmit}
//           newTodoField={newTodoField}
//           setTitle={setTitle}
//           isAdding={isAdding}
//           title={title}
//         />

//         <TodoList
//           filteredTodos={filteredTodos}
//           deleteTodo={deleteTodo}
//           selectedTodoId={selectedTodoId}
//           completedTodos={completedTodos}
//           isClicked={isClicked}
//           // doubleClick={doubleClick}
//           doubleClickTodoId={doubleClickTodoId}
//           changeTitle={changeTitle}
//           setChangeTitle={setChangeTitle}
//           changeStatusTodo={changeStatusTodo}
//           todoStatus={todoStatus}
//           todoStatusId={todoStatusId}
//           changeTitleTodo={changeTitleTodo}
//         />
//         <Footer
//           clearTable={clearTable}
//           handleFilterType={handleFilterType}
//           filterType={filterType}
//           filteredTodos={filteredTodos}
//         />

//       </div>

//       <ErrorNotification
//         error={error}
//         removeError={removeError}
//         errorMessage={errorMessage}
//       />
//     </div>
//   );
// };
