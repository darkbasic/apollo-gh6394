import React, { useState } from 'react';
import { gql, useMutation, Reference } from '@apollo/client';
import { Modifier } from '@apollo/client/cache/core/types/common';

const addCommentMutation = gql`
  mutation addComment($articleId: ID!, $content: String!) {
    addComment(articleId: $articleId, content: $content) {
      id
      content
    }
  }
`;

function AddComment({articleId}: any) {
  const [content, setContent] = useState('');

  const [addComment] = useMutation(addCommentMutation, {
    update(cache, {data: mutationData}) {
      if (mutationData) {
        const newCommentRef = cache.writeFragment({
          data: mutationData.addComment,
          fragment: gql`
            fragment Comment on Comment {
              id
              content
            }
          `,
          fragmentName: 'Comment',
        });
        const cursor = mutationData.addComment.id;
        if (!newCommentRef) {
          throw new Error("Couldn't write fragment to cache");
        }
        const handleComments: Modifier<{edges: Array<{node: Reference}>}> = (connection) => {
          if (
            connection.edges.some(
              ({node}) => node.__ref === newCommentRef.__ref,
            )
          ) {
            return connection;
          }
          return {
            ...connection,
            edges: [
              {
                __typename: 'CommentEdge',
                cursor,
                node: newCommentRef,
              },
              ...connection.edges,
            ],
          };
        };

        // This won't work because we use cache redirects (how is the component supposed to know?)
        // But since fetchMore will write a new query to the cache with the new elements appended it would be needed
        // to cover such case as well
        // Also, this would insert a new comment in ALL articles, because cache.modify doesn't expose args!
        // You may think we could use writeQuery instead, but we don't have any knowledge about the "first"/"last" args
        // You could omit "first"/"last" from the key args, but then how are you supposed to know if you need to
        // append or prepend the new comment? Because you can paginate both forward AND backward depending on which
        // argument you specify between "first" or "last".
        // If cache.modify exposed the args that would be easy to fix
        cache.modify({
          fields: {
            comments: handleComments,
          },
        });

        // This will work with cache redirects, but if you triggered fetchMore you will have to run the previous one
        cache.modify({
          id: cache.identify({
            __typename: 'Article',
            id: articleId,
          }),
          fields: {
            comments: handleComments,
          },
        });
      }
    },
  });

  return (
    <>
      <form onSubmit={event => {
        addComment({
          variables: {articleId, content},
        });
        event.preventDefault();
      }}>
        <label>
          Nome:
          <input type="text" value={content} onChange={event => setContent(event.target.value)} />
        </label>
        <input type="submit" value="Add comment" />
      </form>
    </>
  );
}

export default AddComment;
